var app = (() => {
  let api = new WebSocket('ws://sketchy.com/api');
  api.addEventListener('open',handleSocketOpen);
  api.addEventListener('close',handleSocketClose);
  api.addEventListener('message',handleSocketMessage);
  let canvas = false, ctx = false, drawing = false, trace = []. self = {};
  Object.defineProperties(self, {canvas: {get: () => canvas}, ctx: {get: () => ctx},drawing: {get: () => drawing}});
  self.bootstrap = function(){
    canvas = document.querySelector('canvas');
    canvas.setAttribute('width',canvas.getBoundingClientRect().width);
    canvas.setAttribute('height',canvas.getBoundingClientRect().height);
    ctx = canvas.getContext('2d');
    canvas.addEventListener('mousedown', e => {})
    canvas.addEventListener('mousemove', redraw)
    canvas.addEventListener('mouseup', e => {})
  };
  function redraw(e){
    let {lastX, lastY} = ctx;
    let {buttons, offsetX:currX, offsetY:currY} = e;
    send({lp: {buttons, lastX, lastY, currX, currY}})
    if(!buttons) return (delete ctx.lastX) + (delete ctx.lastY);
    ctx.strokeStyle = '#FC0';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(lastX || currX - 1, lastY || currY - 1);
    ctx.lineTo(ctx.lastX = currX, ctx.lastY = currY);
    ctx.closePath();
    ctx.stroke();

 

  }
  function handleSocketOpen({target:api}){
    //lp - LivePath
    send({lp: [23,42]});
  }
  function handleSocketClose(){}
  function handleSocketMessage({data:message,target:api}){
    if(/^[\[|\{]/.test(message)) message = JSON.parse(message);
    console.log("RECEIVED:",message);
  }
  function send(message){
    if(message && (Array.isArray(message) || message.hasOwnProperty || (typeof message == 'string' && !/^[\[|\{]/.test(message)))) message = JSON.stringify(message);
    api.send(message);
    console.log('SEND:',message);
  }
  return self;
})();

app.bootstrap();