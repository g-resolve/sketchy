const {Room, RoomCoordinator} = require('./modules/rooms');
const WebSocket = require('ws');
const port = 80;
const path = require('path');
const fs = require('fs');
const app = require('express')();
const es6Renderer = require('express-es6-template-engine');
const appPath = process.cwd() + '/../app';
const paths = {css: appPath + '/css', views: appPath + '/views', scripts: appPath + '/scripts'}
global.RoomCoordinator = RoomCoordinator;
global.Room = Room;
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
  if(req.path == '/')
    app.render('index', (e, html) => res.status(200).end(html));
  else
    fs.exists(appPath + req.path, (e) => {
      if(!e){
        res.status(404).end("Not Found");
      }else{
        res.writeHead(200, {'Content-Type': 'text/' + path.extname(req.path).slice(1)});
        fs.createReadStream(appPath + req.path).pipe(res);
      }
    });
})
const ws = new WebSocket.Server({server: app.listen(port, () => console.log("I'm listening"))});
ws.on('connection', wsConn => {
  wsConn.on('message', function(message){
    if(/^[\[|\{]/.test(message)) message = JSON.parse(message);
    else return console.log("Malformed message received.");
    let mid = message.mid;
    Promise.all(Object.keys(message).filter(k => (typeof ws[k] == 'function')).map(k => ws[k].call(this, message[k])))
      .then(results => wsConn.send(JSON.stringify({mid, results})));
    
    //wsConn.send('I got your message bro [' + message + ']');
  }.bind(wsConn));
  global.connections = global.connections || [];
  global.connections.push(wsConn);
  wsConn.on('error', () => console.log('Connection disconnected/error'));
});
ws.on('error', () => console.log('Socket disconnected/error'));
//Live Paint
ws.livePaint = (message) => new Promise(resolve => {
 for(let client of ws.clients){
   if(client.guid !== message.guid){
     client.send(JSON.stringify(message));
   }else{
    
   }
 }
 resolve('Live paint sent');
});
ws.handshake = (message) => new Promise(resolve => {
  console.log('handshake', message);
  Object.assign(this, message);
  resolve('Handshake received');
});
