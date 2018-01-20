const WebSocket = require('ws');
const port = 80;
const fs = require('fs');
const app = require('express')();
app.use(/\./, (req, res, next) => {
  fs.createReadStream();
});
//app.use((req, res) => {
//  res.end('Hello');
//});
const ws = new WebSocket.Server({server: app.listen(port, () => console.log("I'm listening"))});
ws.on('connection', wsConn => {
  wsConn.on('message', data => {
    wsConn.send('I got your message bro');
  });
});


