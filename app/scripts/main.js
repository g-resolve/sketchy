const DEFAULT_FPS = 10;
class DrawBuffer extends Array{
  constructor(interval){
    super();
    this.interval = Math.floor(1000 / (interval || DEFAULT_FPS));
    this.then = this.now = Date.now();
    this.stopped = false;
    this.now = false;
    return this;
  }
  start(){
    if(this.stopped || !this.length) return false; 
    requestAnimationFrame(this.start.bind(this));
    this.now = Date.now();
    let delta = this.now - this.then;
    if (delta > this.interval) {
      this.then = this.now - (delta % this.interval);
      let inkDrop = this.shift();
      inkDrop.lp.buttons && console.log(inkDrop.lp.currX, inkDrop.lp.currY, delta, this.interval, (delta % this.interval));
    }
  }
  stop(){
    this.stopped = true;
  }
  queue(data){
     data && this.push(data);
     this.start();
  }
}
class Player{
  constructor(el){
    this.element = this.e = el;
    this.element.on('mouseover', () => $(pencil).hide('fast'));
    return this;
  }
  says(message){
    message = message && Promise.resolve(message);
    message.then(m => {
      this.e.message = this.e.message || $(`<message>`);
      this.e.message.html(m).insertBefore(this.e);
    });
  }
}
var app = (() => {
  let players = [], 
      myGUID = guid(), 
      pencil = false, 
      canvas = false, 
      ctx = false, 
      drawing = false, 
      trace = [], 
      self = {},
      url = new URL(window.location),
      api = new WebSocket('ws://' + url.hostname + '/api'),
      randomMessages = $.getJSON('https://api.whatdoestrumpthink.com/api/v1/quotes').promise(),
      genericPlayerNames = [''];
      buffer = new DrawBuffer();
  api.addEventListener('open',handleSocketOpen);
  api.addEventListener('close',handleSocketClose);
  api.addEventListener('message',handleSocketMessage);
  
  Object.defineProperties(self, {
    randos: {value: (x) => getRandomUsers(x||Math.floor(Math.random()*10))}, 
    canvas: {get: () => canvas}, 
    players: {get: () => players}, 
    pencil: {get: () => pencil}, 
    ctx: {get: () => ctx},
    drawing: {get: () => drawing}
  });
  self.bootstrap = function(){
    canvasWrapper = document.querySelector('#canvas');
    canvas = document.querySelector('canvas');
    pencil = document.querySelector('#pencil');
    ctx = canvas.getContext('2d');

    canvasWrapper.addEventListener('mousedown', e => {});
    canvasWrapper.addEventListener('mousemove', handleMouseMove);
    canvasWrapper.addEventListener('mouseup', e => {});
    injectPlayers().then(artificialActivities);
    resetBounds();
    windowEvents();

  };
  function resetBounds(){
    canvasWrapper.bounds = canvasWrapper.getBoundingClientRect();
    pencil.bounds = pencil.getBoundingClientRect();
    canvas.setAttribute('width',canvasWrapper.getBoundingClientRect().width);
    canvas.setAttribute('height',canvasWrapper.getBoundingClientRect().height);
  }
  function handleMouseMove(e){
    movePencil(e);
    redraw(e);
  }
  function movePencil(e){
    //console.log(canvasWrapper.bounds.top);
    pencil.style.top = Math.floor(e.y - pencil.bounds.height);
    pencil.style.left = e.x;
  }
  function redraw(e){
    let {lastX, lastY} = ctx;
    let {buttons, x:currX, y:currY, guid:receivedDraw} = e;
    //console.log(e.target);
    if((e.y < canvasWrapper.bounds.top) || (e.x > canvasWrapper.bounds.right)){
      return $(pencil).hide('fast');
    }else{
      $(pencil).show();
    }
    //if(e.target && (e.target.tagName == "IMG")) return;
    if(!receivedDraw){
      buffer.queue({lp: {guid: myGUID, buttons, color: false, lastX, lastY, currX, currY}})
    }
    currX -= canvasWrapper.bounds.left;
    currY -= canvasWrapper.bounds.top;

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
  function addToBuffer(obj){
    
  }
  function send(message){
    if(message && (Array.isArray(message) || message.hasOwnProperty || (typeof message == 'string' && !/^[\[|\{]/.test(message)))) message = JSON.stringify(message);
    //console.log(api.readyState);
    api.readyState && api.send(message);
  }
  function guid() {
    let u = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return u() + u() + '-' + u() + '-' + u() + '-' + u() + '-' + u() + u() + u();
  }
  function windowEvents(){
    let listeners = {
      resize: resetBounds
    }
    for(let listener in listeners){
      window.addEventListener(listener, listeners[listener]);
    }
  }
  function injectPlayers(){
    return app.randos().then(({results:ps}) => {
      let playersContainer = document.getElementById('players');
      return ps.map(p => {
        let playerElement = $(`<player>`);
        $(`<img src="${p.picture.thumbnail}">`).appendTo(playerElement);
        $(`<name>`).html(p.name.first).appendTo(playerElement);
        players.push(new Player(playerElement.appendTo(playersContainer)));
      });
    })
  }
  function artificialActivities(){
    let baseFrequency = 1;
    let chosenPlayer = app.players[Math.floor(Math.random() * app.players.length)];
    chosenPlayer.says(getRandomMessage());
    clearInterval(app.artificialInterval);
    app.artificialInterval = setInterval(() => {
      setTimeout(artificialActivities, Math.random() * 3000);
    }, 1000)
    
  }
  function getRandomUsers(number){
    return $.getJSON('https://randomuser.me/api?results='+(number||1))
    .promise();
  }
  function getRandomMessage(recipient){
    recipient = recipient || "Someone";
    return randomMessages.then(rM => {
      let coinFlip = Math.round(Math.random()), prependUserName = recipient + " ";
      if(coinFlip){ prependUserName = '' }
      let messages = Object.values(rM.messages)[coinFlip];
      return chosenMessage = prependUserName + messages[Math.floor(Math.random() * messages.length)];
    })
  }
  return self;
})();

app.bootstrap();