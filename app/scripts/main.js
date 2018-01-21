var app = (() => {
  let api = new WebSocket('ws://sketchy.com/api');
  api.addEventListener('open',handleSocketOpen);
  api.addEventListener('close',handleSocketClose);
  api.addEventListener('message',handleSocketMessage);
  let myGUID = guid(), pencil = false, canvas = false, ctx = false, drawing = false, trace = []. self = {};
  Object.defineProperties(self, {canvas: {get: () => canvas}, pencil: {get: () => pencil}, ctx: {get: () => ctx},drawing: {get: () => drawing}});
  self.bootstrap = function(){
    canvasWrapper = document.querySelector('#canvas');
    canvasWrapper.bounds = canvasWrapper.getBoundingClientRect();
    canvas = document.querySelector('canvas');
    pencil = document.querySelector('pencil');
    pencil.bounds = pencil.getBoundingClientRect();
    canvas.setAttribute('width',canvas.getBoundingClientRect().width);
    canvas.setAttribute('height',canvas.getBoundingClientRect().height);
    ctx = canvas.getContext('2d');
    canvasWrapper.addEventListener('mousedown', e => {});
    canvasWrapper.addEventListener('mousemove', redraw);
    canvasWrapper.addEventListener('mouseup', e => {});

  };
  function redraw(e){
    let {lastX, lastY} = ctx;
    let {buttons, x:currX, y:currY} = e;
    currX -= canvasWrapper.bounds.left;
    currY -= canvasWrapper.bounds.top;
    pencil.style.top = Math.floor(currY - pencil.bounds.height);
    pencil.style.left = currX;
    !e.guid && send({lp: {guid: myGUID, buttons, color: false, lastX, lastY, currX, currY}})
    if(!buttons) return (delete ctx.lastX) + (delete ctx.lastY);
    ctx.strokeStyle = '#333';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(lastX || currX - 1, lastY || currY - 1);
    ctx.lineTo(ctx.lastX = currX, ctx.lastY = currY);
    ctx.closePath();
    ctx.stroke();

 

  }
  function handleSocketOpen({target:api}){
    send({handshake: {guid:myGUID}})
  }
  function handleSocketClose(){}
  function handleSocketMessage({data:message,target:api}){
    if(/^[\[|\{]/.test(message)) message = JSON.parse(message);
    if(lpRelay = message.lpRelay) redraw({guid: lpRelay.guid, x: lpRelay.currX, y: lpRelay.currY, buttons: lpRelay.buttons})
  }
  function send(message){
    if(message && (Array.isArray(message) || message.hasOwnProperty || (typeof message == 'string' && !/^[\[|\{]/.test(message)))) message = JSON.stringify(message);
    api.send(message);
    console.log('SEND:',message);
  }
  function guid() {
    let u = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return u() + u() + '-' + u() + '-' + u() + '-' + u() + '-' + u() + u() + u();
  }
  return self;
})();

app.bootstrap();