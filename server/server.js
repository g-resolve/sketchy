const {guid} = require('./modules/utils');
const loki = require('lokijs');
const DB = new loki('app.json', {autosave: true});
const press = require('node-minify');
const WebSocket = require('ws');
const {URL} = require('url');
const http = require('http');
const request = require('request');
const port = 80;
const path = require('path');
const fs = require('fs');
const app = require('express')();
const rm = require('run-middleware')(app);
const passport = require('passport');
const LStrategy = require('passport-local').Strategy;
const GStrategy = require('passport-google-oauth20').Strategy;
const FStrategy = require('passport-facebook').Strategy;
const TStrategy = require('passport-twitter').Strategy;
const {GConfig,FConfig,TConfig,LConfig} = require('./modules/passport');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const sessionParser = session({ name: 'wescribble', store: new FileStore({reapInterval: -1}), secret: "drawingisfun", resave: false, saveUninitialized: false});
const es6Renderer = require('express-es6-template-engine');
const appPath = process.cwd() + '/../app';
const paths = {css: appPath + '/css', views: appPath + '/views', scripts: appPath + '/scripts'}
var ENV = 'dev';
let [DEV,PROD] = [ENV=='dev', ENV=='prod'];

global.DB = DB;
global.press = press;
global.playerSocketMap = new Map();
global.socketPlayerMap = new WeakMap();
app.engine('html', es6Renderer);
app.set('view engine', 'html');
app.set('views', paths.views);

app.use((req,res,next) => {
  if(path.extname(req.path)){
    let ext = path.extname(req.path).slice(1);
    let audio = /mp3|wav/i.test(ext);
    let content = (() => {
      let content = 'text/'+ext;
      if(audio) content = 'arraybuffer'
      return content;
    })()
    return fs.exists(appPath + req.path, (e) => {
      if(!e){
        res.status(404).end("Not Found");
      }else{
        res.writeHead(200, {'Content-Type': content });
        if(PROD && !/jquery/.test(path.basename(req.path)) && (path.extname(req.path) == '.js')){
          let {dir, name, ext} = path.parse(req.path);
          let newPath = appPath + dir + '/' + name + '.min' + ext;
          console.log(newPath);
          press.minify({compressor: 'babel-minify', input: appPath + req.path, output: newPath, callback: (err, min) => res.end(min)})
        }else{
          fs.createReadStream(appPath + req.path).pipe(res);
        }
      }
    });
  }else if (req.path == '/'){
    renderDefault(req,res,next);
  }else{
    next();
  }
  
})
// app.route('/api')
//   .all((req, res) => {
//     res.end('Just the server here...');
//   })
//   .get((req, res) => {

//   })
//   .post((req, res) => {

//   })
passport.use('local-auth', new LStrategy(LConfig));
passport.use('facebook-auth', new FStrategy(FConfig, processAuthUser));
passport.use('twitter-auth', new TStrategy(TConfig, processAuthUser));
passport.use('google-auth', new GStrategy(GConfig, processAuthUser));
function processAuthUser(){
  let args = Array.from(arguments);
  let [profile, done] = args.slice(-2);
  let token = args.find(a => typeof a == "string" && !/\-/.test(a));
  return done(null, Object.assign(profile, {token}));
}
passport.serializeUser((user, done) => {
  console.log("Serialize:", user);
  done(null, user.id);
})
passport.deserializeUser((id, done) => {
  console.log("Deserialize:", id);
  done(null, {id});
});

app.param('endpoint', (req,res,next,endpoint) => (req.endpoint = endpoint) && next());
app.get('/login/:endpoint', (req, res, next) => {
  request({
    headers: {'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'},
    url: req.protocol + '://' + req.hostname + '/api/' + req.endpoint
  }).pipe(res);
})
app.use(sessionParser);
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

function injectPlayer(req){
  req.session = req.session || {};
  req.session.player = req.session.player || new Player();
  if(!(req.session.player instanceof Player)){
    req.session.player = new Player(req.session.player);
  }
  return req.session.player;
}
app.all('/api/flogin', passport.authenticate('facebook-auth', {display: 'popup', scope: ['email']}));
app.all('/api/glogin', passport.authenticate('google-auth', {scope: ['email']}));
app.all('/api/tlogin', passport.authenticate('twitter-auth', {scope: ['email']}));
app.all('/api/login', passport.authenticate('local-auth'), (req, res) => {
  res.end(JSON.stringify(req.user));
})
app.all('/api/logout', (req, res, next) => {
  req.session.destroy(function(err) {
    if (err) {
      console.error(err);
    } else {
      res.clearCookie('wescribble');
      req.logout();
      res.redirect('/');
    }
  });
});
app.all('/api/:endpoint/callback', (req,res,next)=>{
  passport.authenticate(req.endpoint + '-auth', (error, user) => {
    if(!error){
      req.session.player = user;
      injectPlayer(req);
    }
    res.redirect('/');
  })(req,res,next);
})
app.get('/api/user', (req,res,next) => {
  return res.json(injectPlayer(req));
});
app.get('/api/rooms', (req,res,next) => {
  return res.json(Coordinator.getRooms());
});
app.param('rid', (req,res,next,rid)=>(req.rid=rid) && next());
app.get('/socket/room/:rid', (req,res,next)=>{
  if(req.rid && (req.rid != 'undefined')){
    try{
      Coordinator.addToRoom(req.player, req.rid)  
    }catch(e){
      debugger;
    }
  }
  next();
})
app.get('/socket/rooms', (req,res,next)=>{
  req.player.send({rooms: Coordinator.addToLobby(req.player)});
  next();
})

//When all else fails ... throw up that index page...
app.use(renderDefault);
function renderDefault(req,res,next){
  app.render('index', (e, html) => res.status(200).end(html))
}

//LOAD IT UP!
DB.loadDatabase({}, e => {
  const {Room} = require('./modules/rooms');
  const {Coordinator} = require('./modules/coordinator');
  const {Player} = require('./modules/player');
  global.Room = Room;
  global.Player = Player;
  global.Coordinator = Coordinator;
  
  global.server = app.listen(port, () => console.log("I'm listening"));


  const ws = new WebSocket.Server({server: global.server});
  global.ws = ws;
  ws.on('connection', (wsConn, req) => sessionParser(req, {}, () => {
    let player = req.session.player =  Player.parse(req.session, wsConn);
    let url = new URL(req.headers.origin + req.url);
    let params = Array.from(url.searchParams.entries()).reduce((obj,p) => Object.assign(obj, {[p[0]]:p[1]}), {})
    if(url.pathname.slice(1).length){
      app.runMiddleware('/socket' + url.pathname, Object.assign(params, {player}), () => {});
    }
    //console.warn("socket session:", req.session);

    wsConn.guid = guid();
  //   wsConn.on('message', function(player, message){
  //     console.log("Message from:",player,"|Message:",message);
  //     if(/^[\[|\{]/.test(message)) message = JSON.parse(message);
  //     else return console.log("Malformed message received.");
  //     let mid = message.mid;
  //     let guid = message.guid;
  //     //Promise.all(Object.keys(message).filter(k => (typeof ws[k] == 'function')).map(k => ws[k].call(this, message[k], guid)))
  //     //  .then(results => wsConn.send(JSON.stringify({mid, results})));

  //     //wsConn.send('I got your message bro [' + message + ']');
  //   }.bind(wsConn, req.session.player));
    wsConn.onerror = () => console.log('Error');
    wsConn.on('error', () => console.log('Connection disconnected/error'));
    wsConn.on('close', () => console.log('Connection closed'));
    //wsConn.send(JSON.stringify({guid: wsConn.guid}));
  }));
  ws.onerror = () => console.log('onerror', 'Socket disconnect/error');
  ws.on('error', e => console.log('Socket disconnected/error',e));
  ws.joinRoom = (messge, guid) => new Promise(resolve => {
    //Coordinator.rooms
  })
  //Live Paint
  ws.livePaint = (message, guid) => new Promise(resolve => {
   for(let client of ws.clients){
     if(client.guid !== guid){
       message.guid = guid;
       client.send(JSON.stringify({livePaint: message}));
     }else{

     }
   }
   resolve('Live paint sent');
  });
  
});
