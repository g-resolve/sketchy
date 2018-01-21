var app = (() => {
  let url = new URL(window.location);
  let api = new WebSocket('ws://' + url.hostname + '/api');
  let randomMessages = $.getJSON('https://api.whatdoestrumpthink.com/api/v1/quotes').promise();
  let genericPlayerNames = ['']
  api.addEventListener('open',handleSocketOpen);
  api.addEventListener('close',handleSocketClose);
  api.addEventListener('message',handleSocketMessage);
  let players = [], myGUID = guid(), pencil = false, canvas = false, ctx = false, drawing = false, trace = []. self = {};
  Object.defineProperties(self, {randos: {value: (x) => getRandomUsers(x||Math.floor(Math.random()*10))}, canvas: {get: () => canvas}, players: {get: () => players}, pencil: {get: () => pencil}, ctx: {get: () => ctx},drawing: {get: () => drawing}});
  self.bootstrap = function(){
    canvasWrapper = document.querySelector('#canvas');
    canvas = document.querySelector('canvas');
    pencil = document.querySelector('#pencil');
    resetBounds();
 
    ctx = canvas.getContext('2d');
    canvasWrapper.addEventListener('mousedown', e => {});
    canvasWrapper.addEventListener('mousemove', redraw);
    canvasWrapper.addEventListener('mouseup', e => {});
    injectPlayers();
    windowEvents();
    artificialActivities();
  };
  function resetBounds(){
    canvasWrapper.bounds = canvasWrapper.getBoundingClientRect();
    pencil.bounds = pencil.getBoundingClientRect();
    canvas.setAttribute('width',canvasWrapper.getBoundingClientRect().width);
    canvas.setAttribute('height',canvasWrapper.getBoundingClientRect().height);
  }
  function redraw(e){
    let {lastX, lastY} = ctx;
    let {buttons, x:currX, y:currY} = e;
    //console.log(e.target);
    if((e.y < canvasWrapper.bounds.top) || (e.x > canvasWrapper.bounds.right)){
      return $(pencil).hide('fast');
    }else{
      $(pencil).show();
    }
    //if(e.target && (e.target.tagName == "IMG")) return;
    !e.guid && send({lp: {guid: myGUID, buttons, color: false, lastX, lastY, currX, currY}})
    currX -= canvasWrapper.bounds.left;
    currY -= canvasWrapper.bounds.top;
    pencil.style.top = Math.floor(currY + canvasWrapper.bounds.top - pencil.bounds.height);
    pencil.style.left = currX;
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
    app.randos().then(({results:ps}) => {
      let playersContainer = document.getElementById('players');
      ps.map(p => {
        let playerElement = $(`<player>`);
        $(`<img src="${p.picture.thumbnail}">`).appendTo(playerElement);
        $(`<name>`).html(p.name.first).appendTo(playerElement);
        players.push(new Player(playerElement.appendTo(playersContainer)));
      });
    })
  }
  function artificialActivities(){
    let baseFrequency = 1;

    randomMessages.then(rM => {
      let coinFlip = Math.round(Math.random()), prependUserName = 'USER_NAME ';
      if(coinFlip){ prependUserName = '' }
      let messages = Object.values(rM.messages)[coinFlip];
      let chosenMessage = prependUserName + messages[Math.floor(Math.random() * messages.length)];

    })
  }
  function getRandomUsers(number){
    return $.getJSON('https://randomuser.me/api?results='+(number||1))
    .promise();
  }

  function getRandomMessage(){
    return randomMessages.then(rM => {
      debugger;
    })
  }
  class Player{
    constructor(el){
      this.element = this.e = el;
      this.element.on('mouseover', () => $(pencil).hide('fast'));
      return this;
    }
    says(message){
      this.e.message = 
      this.e.append($(`<message>`).html(message));
    }

  }
  return self;
})();

app.bootstrap();