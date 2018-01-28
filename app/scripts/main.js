
var app = (() => {
  let players = [], 
      myGUID = guid(), 
      pencil = false, 
      canvas = false, 
      ctx = false, 
      drawing = false, 
      trace = [], 
      self = {},
      
      randomMessages = $.getJSON('https://api.whatdoestrumpthink.com/api/v1/quotes').promise(),
      genericPlayerNames = [''];
      buffer = new DrawBuffer();

  Object.defineProperties(self, {
    randos: {value: (x) => getRandomUsers(x||Math.floor(Math.random()*10))}, 
    canvas: {get: () => canvas}, 
    players: {get: () => players}, 
    pencil: {get: () => pencil}, 
    ctx: {get: () => ctx},
    drawing: {get: () => drawing}
  });
  self.bootstrap = function(){
    wrapper = document.querySelector('#wrapper');
    canvasWrapper = document.querySelector('#canvas');
    canvas = document.querySelector('canvas');
    pencil = document.querySelector('#pencil');
    ctx = canvas.getContext('2d');
    S.onlivepaint = redraw;
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
    if((e.y < canvasWrapper.bounds.top) || (e.x > canvasWrapper.bounds.right)){
      return $(pencil).hide('fast');
    }else{
      $(pencil).show();
    }
  }
  function redraw(e){
    let {lastX, lastY} = ctx;
    let {buttons, x:currX, y:currY, guid:receivedDraw} = e;
    //console.log(e.target);

    //if(e.target && (e.target.tagName == "IMG")) return;
    if(!receivedDraw){
      console.log("Sending Draw");
      buffer.queue({livePaint: {buttons, color: false, lastX, lastY, x:currX, y:currY}})
    }else{
      console.log("Received a Draw");
    }
    currX -= canvasWrapper.bounds.left;
    currY -= canvasWrapper.bounds.top;
     //console.log(e);
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
    if(livePaint = message.livePaint) redraw({guid: livePaint.guid, x: livePaint.currX, y: livePaint.currY, buttons: livePaint.buttons})
  }
//   function send(message){
//     if(message && (Array.isArray(message) || message.hasOwnProperty || (typeof message == 'string' && !/^[\[|\{]/.test(message)))) message = JSON.stringify(message);
//     //console.log(api.readyState);
//     api.readyState && api.send(message);
//   }

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