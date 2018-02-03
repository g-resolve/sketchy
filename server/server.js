const {guid} = require('./modules/utils');
const {Room} = require('./modules/rooms');
const {Player} = require('./modules/player');
const WebSocket = require('ws');
const port = 80;
const path = require('path');
const fs = require('fs');
const app = require('express')();
const es6Renderer = require('express-es6-template-engine');
const appPath = process.cwd() + '/../app';
const paths = {css: appPath + '/css', views: appPath + '/views', scripts: appPath + '/scripts'}
global.Room = Room;
global.Player = Player;
app.engine('html', es6Renderer);
app.set('view engine', 'html');
app.set('views', paths.views);
app.route('/api')
  .all((req, res) => {
    res.end('Just the server here...');
  })
  .get((req, res) => {

  })
  .post((req, res) => {

  })
app.use((req,res,next) => {
  if(path.extname(req.path)){
    return fs.exists(appPath + req.path, (e) => {
      if(!e){
        res.status(404).end("Not Found");
      }else{
        res.writeHead(200, {'Content-Type': 'text/' + path.extname(req.path).slice(1)});
        fs.createReadStream(appPath + req.path).pipe(res);
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
