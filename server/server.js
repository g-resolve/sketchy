const {guid} = require('./modules/utils');
const {Room} = require('./modules/rooms');
const {Player} = require('./modules/player');
const press = require('node-minify');
const WebSocket = require('ws');
const port = 80;
const path = require('path');
const fs = require('fs');
const app = require('express')();
const passport = require('passport');
const LStrategy = require('passport-local').Strategy;
const GStrategy = require('passport-google').Strategy;
const FStrategy = require('passport-facebook').Strategy;
const TStrategy = require('passport-twitter').Strategy;
const {GConfig,FConfig,TConfig,LConfig} = require('./modules/passport');
const session = require('express-session');
const es6Renderer = require('express-es6-template-engine');
const appPath = process.cwd() + '/../app';
const paths = {css: appPath + '/css', views: appPath + '/views', scripts: appPath + '/scripts'}
var ENV = 'dev';
let [DEV,PROD] = [ENV=='dev', ENV=='prod'];
global.Room = Room;
global.Player = Player;
global.press = press;
app.engine('html', es6Renderer);
app.set('view engine', 'html');
app.set('views', paths.views);

// app.route('/api')
//   .all((req, res) => {
//     res.end('Just the server here...');
//   })
//   .get((req, res) => {

//   })
//   .post((req, res) => {

//   })
passport.use('local-auth', new LStrategy(LConfig));
passport.use('facebook-auth', new FStrategy(FConfig, (accessToken, refreshToken, profile, done) => {
  debugger;
  done(null, {id: "FB Guy"});
}));
passport.use('twitter-auth', new TStrategy(TConfig, (req, token, tokenSecret, profile, done) => {
  debugger;
}));
passport.use('google-auth', new GStrategy(GConfig, (token, tokenSecret, profile, done) => {
  debugger;
}));
passport.serializeUser((user, done) => {
  console.log("Serialize:", user);
  done(null, user.id);
})
passport.deserializeUser((id, done) => {
  console.log("Deserialize:", id);
  done(null, {id});
})
app.use(session({ secret: "drawingisfun", resave: true, saveUninitialized: true}));
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());
app.all('/api/fblogin', passport.authenticate('facebook-auth'), (req, res) => {
  res.end(JSON.stringify(req.user));
})
app.all('/api/login', passport.authenticate('local-auth'), (req, res) => {
  res.end(JSON.stringify(req.user));
})
app.all('/api/logout', (req, res, next) => {
  req.logout();
  res.end('Bye! :p');
})
app.param('endpoint', (req,res,next,endpoint) => req.endpoint = endpoint);
app.all('/api/:endpoint/callback', (req,res,next)=>{
  res.end('Done');
})

app.use((req,res,next) => {
  if(path.extname(req.path)){
    return fs.exists(appPath + req.path, (e) => {
      if(!e){
        res.status(404).end("Not Found");
      }else{
        res.writeHead(200, {'Content-Type': 'text/' + path.extname(req.path).slice(1)});
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
  }
  app.render('index', (e, html) => res.status(200).end(html));
})
const ws = new WebSocket.Server({server: app.listen(port, () => console.log("I'm listening"))});
ws.on('connection', wsConn => {
  wsConn.guid = guid();
  wsConn.on('message', function(message){
    if(/^[\[|\{]/.test(message)) message = JSON.parse(message);
    else return console.log("Malformed message received.");
    let mid = message.mid;
    let guid = message.guid;
    Promise.all(Object.keys(message).filter(k => (typeof ws[k] == 'function')).map(k => ws[k].call(this, message[k], guid)))
      .then(results => wsConn.send(JSON.stringify({mid, results})));
    
    //wsConn.send('I got your message bro [' + message + ']');
  }.bind(wsConn));
  wsConn.on('error', () => console.log('Connection disconnected/error'));
  wsConn.on('close', () => console.log('Connection closed'));

  wsConn.send(JSON.stringify({guid: wsConn.guid}));
  global.connections = global.connections || [];
  global.connections.push(wsConn);
});
ws.on('error', () => console.log('Socket disconnected/error'));

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
