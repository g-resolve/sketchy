const WebSocket = require('ws');
const port = 80;
const path = require('path');
const fs = require('fs');
const app = require('express')();
const es6Renderer = require('express-es6-template-engine');
const appPath = process.cwd() + '/../app';
const paths = {css: appPath + '/css', views: appPath + '/views', scripts: appPath + '/scripts'}
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
  wsConn.on('message', data => {
    if(/^[\[|\{]/.test(data)) data = JSON.parse(data);
    else return console.log("Malformed data received.");
    Object.keys(data).forEach(k => (typeof ws[k] == 'function') && ws[k](data[k]))
    
    //wsConn.send('I got your message bro [' + data + ']');
  });
  global.connections = global.connections || [];
  global.connections.push(wsConn);
  wsConn.on('error', () => console.log('Connection disconnected/error'));
});
ws.on('error', () => console.log('Socket disconnected/error'));
ws.lp = function(data){
  console.log("Live Path", data);
}
