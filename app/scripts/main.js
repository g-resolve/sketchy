
var app = (() => {
  let players = [], 
      myGUID = guid(), 
      pencil = false, 
      canvas = false, 
      ctx = false, 
      drawing = false, 
      trace = [], 
      self = {},
      playerWrapper = false,
      wrapper = false,
      messageKnob = false,
      content = $("#content"),
      overlay = $("#overlay"),
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
  self.bootstrap = function(initParams){
    templateFill(initParams);
    templateActions();
    /*
    wrapper = document.querySelector('#wrapper');
    canvasWrapper = document.querySelector('#canvas');
    canvas = document.querySelector('canvas');
    pencil = document.querySelector('#pencil');
    messageKnob = document.querySelector("#knob");
    playerWrapper = document.querySelector('#players');
    ctx = canvas.getContext('2d');
    S.onlivepaint = redraw;
    messageKnob.addEventListener('mousedown', startDragKnob);
    canvasWrapper.addEventListener('mousedown', e => {});
    window.addEventListener('mousemove', handleMouseMove);
    canvasWrapper.addEventListener('mouseup', e => {});
    injectPlayers().then(artificialActivities);
    resetBounds();
    windowEvents();
    */
  };

//   self.empty = () => Router.clearTemplates() && self;
//   self.show = (template, options={}) => (parent = options.overlay?overlay.cleanup():content) && Router.getTemplate(template).then(t => t.appendTo(parent)).then(t => {
//     if(!options || !options.overlay) content.attr('class','p' + content.children().toArray().indexOf(t.get(0)));
//   })
//   self.cleanup = template => {
//     $(`link[for='${template}'], .wrapper.${template}`).remove();
//     let children = content.children().toArray();
//     let index = (content.attr('class')||'').slice(1);
//     if(!children[index] && children.length){
//       content.attr('class', 'p' + (children.length-1));
//     }
//   };
//   self.showlogin = () => Router.getTemplate('login').then(html => {
//     $('<section>').html(html).appendTo(content);
//   })
  function templateFill(params){
      let username, birthday = "";
      try{username = params.user._json.name.familyName;}
      catch(e){ username = params.displayName}
      let greeting = username && "Welcome back" || "Welcome to WeScribble!";
      let parsed = {username, greeting}; 
      $('ws-slot').toArray().forEach(s => {
        let children = Array.from(s.attributes).map(a => (parsed[a.name] && {key: a.name, value:parsed[a.name]})).filter(v=>v).map(c => $(`<span class="${c.key}">${c.value}</span>`))
        children.length && $(s).empty().append(children);
      });
  }
  function templateActions(){
    $('[logout]').on('click', () => window.location.href='/api/logout');
  }
  function startDragKnob(e){
    wrapper.dragStart = e.screenY;
    let messageHeight = $("#messages").height();
    $("#messages").prop('originalHeight',messageHeight);
    wrapper.addEventListener('mousemove', doDragKnob);
    wrapper.addEventListener('mouseup', stopDragKnob);
  }
  function doDragKnob(e){
    let offset = wrapper.dragStart - e.screenY;
    let newHeight = $("#messages").prop('originalHeight') + offset;
    $("#messages").height(newHeight);
    
  }
  function stopDragKnob(e){
    wrapper.removeEventListener('mousemove', doDragKnob);
    wrapper.removeEventListener('mouseup', stopDragKnob);
    delete wrapper.dragStart;
    resetBounds();
    
  }
  function resetBounds(){
    canvasWrapper.bounds = canvasWrapper.getBoundingClientRect();
    //pencil.bounds = pencil.getBoundingClientRect();
    canvas.setAttribute('width',canvasWrapper.getBoundingClientRect().width);
    canvas.setAttribute('height',canvasWrapper.getBoundingClientRect().height);
    playerWrapper.bounds = playerWrapper.getBoundingClientRect();
  }
  function handleMouseMove(e){
    if(wrapper.dragStart) return;
    movePencil(e);
    redraw(e);
  }
  function movePencil(e){
    //console.log(canvasWrapper.bounds.top);
    pencil.bounds = pencil.getBoundingClientRect();
    pencil.style.top = Math.floor(e.pageY - pencil.bounds.height );
    pencil.style.left = e.pageX;
    if((e.pageY >= (canvasWrapper.bounds.bottom - 12)) || (e.pageY < canvasWrapper.bounds.top) || (e.pageX > playerWrapper.bounds.left)){
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
    }, 3000)
    
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
Router.init().then(app.bootstrap);