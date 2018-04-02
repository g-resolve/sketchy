
self.room = (() => {
  let server = {},
      players = new Map(), 
      myGUID = guid(), 
      pencil = false, 
      canvas = false, 
      ctx = false, 
      drawing = false, 
      guessedWord = false,
      trace = [], 
      leaderboard,
      myself = {},
      playerWrapper = false,
      wrapper = false,
      morpheus = false,
      clock = false,
      canvasWrapper = false,
      activity = false,
      messageKnob = false,
      audio = {play: () => {}, buffers: []},
      content = $("#content"),
      overlay = $("#overlay"),
      randomMessages = $.getJSON('https://api.whatdoestrumpthink.com/api/v1/quotes').promise(),
      genericPlayerNames = [''];
      buffer = new DrawBuffer();

  Object.defineProperties(myself, {
    randos: {value: (x) => getRandomUsers(x||Math.floor(Math.random()*10))}, 
    canvas: {get: () => canvas}, 
    players: {get: () => d3.selectAll('player').data().reduce((o,v) => {
      if(!v.instance) v.instance = P(self).players[v.id];
      o[v.id]=v;
      return o
    },{})}, 
    pencil: {get: () => pencil}, 
    ctx: {get: () => ctx},
    drawing: {get: () => drawing},
    audio: {get: () => audio},
    server: {get: () => server},
    morph: {value: morph}
  });
  myself.bootstrap = (args) => {
    let roomURL = 'room/' + args.vars.rid;
    return initAudio()
      .then(S.go.bind(S, roomURL))
      .then(startEngine)
  }
  function startEngine(){
    S.subscribe(self, 'end', e => {
      R.go('/');
      console.log('GAME OVER', e.detail);    
    });
    S.subscribe(self, 'start', e => {
      console.log('START GAME', e.detail);
    });
    
    const ACTIONS = {
      AWAITING_PLAYERS: updateBoard,
      GAME_START_COUNTDOWN: updateBoard,
      GAME_STARTED: startNewTurn,
      START_TURN: startNewTurn,
      END_TURN: endTurn,
      NEXT_TURN_COUNTDOWN: updateBoard,
      SELECT_WORD: selectWord,
      PODIUM:  () => { debugger },
      VOTE_RESTART: voteRestart,
      RESTART_COUNTDOWN: () => { debugger },
      GAME_ENDED: () => { debugger },
      REVEAL: updateWord,
      MESSAGE: receiveMessage
    }
    Object.keys(ACTIONS).forEach(ACTION => {
      S.subscribe(self, ACTION, e => ACTIONS[ACTION](e.detail));
    })
    
    //Components
    leaderboard = new Leaderboard();
    wrapper = document.querySelector('.room.wrapper');
    morpheus = document.querySelector('#morpheus');
    canvasWrapper = document.querySelector('#canvas');
    clock = document.querySelector('#clock');
    canvas = document.querySelector('canvas');
    pencil = document.querySelector('#pencil');
    messageKnob = document.querySelector("#knob");
    playerWrapper = document.querySelector('#players');    
    activity = $("#activity");

    
    messageKnob.addEventListener('mousedown', startDragKnob);
    canvasWrapper.addEventListener('mousedown', redraw);
    canvasWrapper.addEventListener('mouseup', stopdraw);
    morpheus.addEventListener('transitionend', e => {
      if(e.target.id != 'morpheus') return true;
      morpheus.classList.remove('morphing');
      clearTimeout(morpheus.callbackBuffer);
      morpheus.callbackBuffer = setTimeout(morpheus.callback.bind(morpheus,e), 10);
    });

    var mc = new Hammer.Manager(wrapper, {recognizers: [[Hammer.Pan]]});
    mc.on('pan',e => {
      let vel = Math.sqrt(Math.abs(e.velocity));
      if(isNaN(vel)){
        debugger;
      }
      ctx.sound && ctx.sound.volume(vel/10); 
      ctx.sound && ctx.sound.speed(0.80 + vel/100); 
      clearTimeout(ctx.silence);
      ctx.silence = setTimeout(() => ctx.sound && ctx.sound.volume(0),100);
    })
    canvasWrapper.addEventListener('contextmenu', e=>e.preventDefault());
    window.addEventListener('mousemove', handleMouseMove);
    ctx = canvas.getContext('2d');

    $("#messagebox").on('submit', sendGuess);
    resetBounds();

    //Fake Stuff
    //injectPlayers().then(artificialActivities);
  }
  function populateRooms({target:el,detail:rooms}){
    rooms = rooms.map(room => 
      $(`<room>`).append(() => Object.keys(room).map(k => 
        $(`<${k} value="${room[k]}">`).html(room[k])))
      .on('click',R.go.bind(R, '/room/' + room.id)));
    $("#rooms").append(rooms); 
  }
  function voteRestart(){
    R.show('vote-restart', {overlay: true}).then(template => {
      let inputs  = $('input', template);
      inputs.on('change', e => {
        e.preventDefault();
        S.send({vote: {restart: e.target.name}}).then(r => {
          //debugger;
          console.log("Sent vote", r);
        })
        $('section:first', template).empty().html('Survey Says...');
      })
    })
  }
  function updateBoard({room,timeLeft}){
    if(room.wordChoices){
      morph(new WordBoard(room.wordChoices));
    }else{
      morph(leaderboard.update(room,timeLeft));
    }
    //let wait;u
    //if(!Q('.wrapper.wait')) wait = R.show('wait',{overlay:true, params: data}).then(d => d.template);
    //else wait = self.wait.update({vars:data});
    
  }
  function announce(){
    debugger;
    //     let announcement = $("#announce-template").prop('content').firstElementChild.cloneNode(true);
//     announcement.querySelector('#announce-round-number').dataset.value = room.currentRound;
    
    //morph(document.importNode(announcement, true));
    //wrapper.append(document.importNode(announcement, true));
  }
  function morph(el){
    if(room.drawCountdown) room.drawCountdown.kill();
    let newHost = $(el).prop('id') || $(el).prop('class');
    if(morpheus.classList.contains(newHost)){
      doMorph();
    }else{
      morpheus.classList.value = 'morphing ' + newHost;
      morpheus.callback = doMorph;
    }

    function doMorph(e){
      //console.log("E", e);
      morpheus.innerHTML = '';
      morpheus.append($(el).get(0));  
    }
    
  }
  function selectWord(wordChoices){
    morph(new WordBoard(wordChoices));
  }
  function results(room){
    console.log("Player Stats", room.playerStats);
    let stats = room.playerStats[room.currentRound];
    let scribblers = Object.keys(stats);
        stats = scribblers.length && stats[scribblers.pop()].map(s => Object.assign({}, self.room.players[s.id], s));
    if(!stats) return false;
    let results = (() => {
      let results;
      if(results = wrapper.querySelector("#results")) return results;
      results = $("#results-template").prop('content').firstElementChild.cloneNode(true);
      results = document.importNode(results, true);
      morph(results);
      return results;
    })();
    
    let list = results.querySelector('#results-list');
    let tbody = list.querySelector('tbody');
    let columns = d3.select(list).selectAll('thead th').nodes().map(n => n.getAttribute('name'));
    let statRow = d3
      .select(tbody)
      .selectAll('tr')
      .data(stats, d => d.id);

    let enterStatRow = statRow.enter().append('tr');
    let exitStatRow = statRow.exit().remove();
    let statCell = statRow.merge(enterStatRow)
      .selectAll('td')
      .data(d => columns.map(c => ({key: c, value: d[c]})), d => JSON.stringify(d.value))
    statCell.exit().remove();
    statCell.enter().append('td').html(d => {
      if(d.key == 'name' || d.key == 'points')
        return d.value;
      if(d.key == 'guessed')
        return d.value ? 'GOT IT!' : 'Good try...';
      if(d.key == 'notes'){
        return JSON.stringify(d.value);
      }
    })
    console.log("RESULTS");
  }
  function countdownTick(room){
    let time = room.timeLeft;
    R.close('vote-restart');
    guessedWord = false;
    setTimeout(() => {
      myself.audio.play(myself.audio.effects.Bell[1]);
      setTimeout(() => myself.audio.play(myself.audio.effects.Bell[1]), 250);
    }, 250);

    //setTimeout(() => myself.audio.play(myself.audio.effects.Boom[Math.round(Math.random())]), 400);
    //setTimeout(() => myself.audio.play(myself.audio.effects.Boom[Math.round(Math.random())]), 1400);
    let interval = createCountdown(time, 1000, tick, done);


    function done(){
      //Done!
    }
    function tick(){
      //console.log('Tick');
    }
  }
  function startNewTurn(turn){
    let turnIndex = turn.currentTurn + "-" + turn.currentRound;
    if(room.turnIndex !== turnIndex){
      morph($('<div id="clock">'))
      $('#overlay').cleanup();
      guessedWord = false;
      clearCanvas();
      updateClock(turn);
    }
    room.turnIndex = turnIndex;
    return updateRound(turn);
  }
  function startNewRound(round){
    morph(self.clock);
    $('#overlay').cleanup();
    guessedWord = false;
    clearCanvas();
    updateRound(round);
  }
  function endTurn({room, timeLeft}){

    morph(leaderboard.update(room));
    //results(round.room);
    updateRound({room, timeLeft});
  }
  function endRound(round){
    announce(round.room);
    updateRound(round);
  }
  function updateRound(round){
    //if(round.pencilHolder)
    //console.log("Round Info", round);
    round = round && round.room ? round.room : round;
    updatePlayers(round.playerList);
    if(Array.isArray(round.wordMask)) updateWord(round.wordMask);
    resetBounds();
  }
  function updateWord(wordMask){
    wordMask = (wordMask||[]).map(letter => ({key: letter, value: letter}));
    let slotCount = 20;
    let midSlot = slotCount / 2;
    let wordMaskLength =  wordMask.length;
    let midMask = wordMaskLength / 2;
    let startPoint = midSlot - midMask;
    let wordEl = $("#word").get(0);
    let letterArray = new Array(20).fill().map(e => ({key: guid(), value: ''}));
    self.lastWordMask = self.lastWordMask || JSON.parse(JSON.stringify(letterArray));
    [].splice.apply(letterArray, [startPoint, wordMaskLength, ...wordMask]);

    self.lastWordMask = JSON.parse(JSON.stringify(letterArray));
    letterArray = d3.select(wordEl).selectAll('ws-letter-slot').data(letterArray);
    let entering_slots = letterArray.enter().append('ws-letter-slot');
    let exiting_slots = letterArray.exit().remove();
    
    let flippers = letterArray.merge(entering_slots)
      .selectAll('.flipper')
      .data(d => [d]);
    let entering_flippers = flippers.enter().append('div').classed('flipper',true);
         entering_flippers.append('span').append('em').classed('front', true);
         entering_flippers.append('span').append('em').classed('back', true);
    let exiting_flippers = flippers.exit().remove();
    
    flippers = flippers.merge(entering_flippers).selectAll('em').data(d => [d,d]);
    
    flippers.each((d,i,e) => {
      let $el = $(e[i]);
      let $parent = $el.parents('.flipper');
      let original = $el.data('prev');
      let isDifferent = original !== d.value;
      if(isDifferent){
        isDifferent;
      }
      let isFlipped = $parent.is('.back');
      let isFront = $el.is('.front');
      if(isDifferent && isFlipped && isFront){
        $el.html(d.value);
        setTimeout(() => $parent.removeClass('back'), 1);
      }else if(isDifferent && !isFlipped && !isFront){
        $el.html(d.value);
        $parent.addClass('back');
      }
      $el.data({prev: d.value});
      console.log({isDifferent, isFlipped, isFront, element: e[i]});
    })

//     sides.merge(entering_sides).each((d,i,e) => {
//       e = e[i];

//       debugger;
//     })

    //flippers.enter().
//     let sides = flippers.selectAll('span').data(d=>d);
//     let entering_sides = sides.enter().append('span').attr('class', (d,i) => i ? 'back' : 'front');
//     let exiting_sides = sides.exit().call(s => {});
    
//     let side = sides.merge(entering_sides).selectAll('b')
//       .data(d => [d], d => d.value);
//     let entering_side = side.enter().append('b');
//     let exiting_side = side.exit().remove();
//     side.merge(entering_side).each((d,i,e) => {
//       e = e[i];
//       let parent = e.parentElement;
//       let flipper = parent.parentElement;
      
//     })
    
    //(guessedWord||wordMask||[]).map(w => $('<ws-letter>').html(w).appendTo(wordEl))
  }
  function listRooms(){
    $.getJSON('/api/rooms').promise().then(rooms => {
      rooms = rooms.map(room => $(`<room>`).append(() => Object.keys(room).map(k => $(`<${k} value="${room[k]}">`).html(room[k]).on('click',R.show.bind(R, '/room/')))));
      $("#rooms").append(rooms);
    }, error => {console.error(error)})
  }
  function updateClock(turn){
    let c = morpheus || self.clock;    
    
    if(room.drawCountdown) room.drawCountdown.kill();
   
    room.drawCountdown = createCountdown(turn.drawTimeLeft, 1000, tick, done);
    function tick(timeLeft){
      //console.log("TICK!!");
      timeLeft = timeLeft/1000;
      c.innerHTML = timeLeft;
      if(timeLeft <= 10){
        c.classList.value = 'clock intense';
      }else{
        c.classList.value = 'clock';
      }
    }
    function done(){
      console.log("Done");
    }
  }
  function sendGuess(e){
    e.preventDefault();
    S.send({messageRoom: {guess: e.target['guess-text'].value}})
      .then(({messageRoom:{guess}}) => {
        if(guess){
          updateWord(guessedWord = guess.split(''));
        }
      })
    e.target['guess-text'].value = '';
  }
  function receiveMessage({from, value:message}){
    console.log(from, message);
    let player = room.players[from];
    player = player && player.instance;
    if(!player) return false;
    player.says(message.replace(/\{foul\}/g,'🤬'));
  }
  function startDragKnob(e){
    wrapper.dragStart = e.screenY;
    let messageHeight = activity.height();
    activity.prop('originalHeight',messageHeight);
    wrapper.addEventListener('mousemove', doDragKnob);
    wrapper.addEventListener('mouseup', stopDragKnob);
  }
  function doDragKnob(e){
    if(!e.buttons) return stopDragKnob(e);
    let offset = wrapper.dragStart - e.screenY;
    let newHeight = activity.prop('originalHeight') + offset;
    activity.height(newHeight);
    
  }
  function stopDragKnob(e){
    wrapper.removeEventListener('mousemove', doDragKnob);
    wrapper.removeEventListener('mouseup', stopDragKnob);
    delete wrapper.dragStart;
    resetBounds();
  }
  function resetBounds(){
    canvasWrapper.bounds = canvasWrapper.getBoundingClientRect();
    let content = $('#content').get(0);
    content.bounds = content.getBoundingClientRect();
    canvas.bounds = canvas.getBoundingClientRect();
    wrapper.bounds = wrapper.getBoundingClientRect();
    pencil.bounds = pencil.getBoundingClientRect();
    let id = ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);
    canvas.setAttribute('width',canvasWrapper.getBoundingClientRect().width);
    canvas.setAttribute('height',content.bounds.height - 120);
    ctx.putImageData(id,0,0);
    playerWrapper.bounds = playerWrapper.getBoundingClientRect();
  }
  function handleMouseMove(e){
    if(wrapper.dragStart) return;
    movePencil(e);
    redraw(e);
  }
  function movePencil(e){
    //console.log(canvasWrapper.bounds.top);
    //console.log(e);
    pencil.bounds = pencil.getBoundingClientRect();
    pencil.style.top = Math.floor(e.pageY - wrapper.bounds.top - pencil.bounds.height );
    pencil.style.left = e.pageX;
    if((e.pageY >= (canvasWrapper.bounds.bottom)) || (e.pageY < canvasWrapper.bounds.top) || (e.pageX > playerWrapper.bounds.left)){
      return $(pencil).hide('fast');
    }else{
      $(pencil).show();
    }
  }
  function clearCanvas(){
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height)
  }
  function redraw(e){
    let {lastX, lastY} = ctx;
    let {buttons, x:currX, pageY:currY, guid:receivedDraw} = e;
    canvas.bounds = canvas.getBoundingClientRect();
    //console.log(e.target);

    //if(e.target && (e.target.tagName == "IMG")) return;
    if(!receivedDraw){
      //console.log("Sending Draw");
      buffer.queue({livePaint: {buttons, color: false, lastX, lastY, x:currX, y:currY}})
    }else{
      console.log("Received a Draw");
    }

    currX -= canvas.bounds.left;
    currY -= canvas.bounds.top;
    //console.log(canvas.bounds.top,currY);
    if(!buttons){
      stopdraw();
      return (delete ctx.lastX) + (delete ctx.lastY);
    }
    ctx.sound = ctx.sound || myself.audio.play(myself.audio.effects.Draw[0], {loop: [0.5,1.2], volume: 0});
    ctx.strokeStyle = '#333';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(lastX || currX - 1, lastY || currY - 1);
    ctx.lineTo(ctx.lastX = currX, ctx.lastY = currY);
    ctx.closePath();
    ctx.stroke();
        //console.log(currX,currY,canvas.bounds);
  }
  function stopdraw(){
    if(ctx.sound){
      ctx.sound.stop();
      delete ctx.sound;
    }
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
    return Promise.resolve(true);
    return myself.randos().then(({results:ps}) => {
      let playersContainer = document.getElementById('players');
      return ps.map(p => {
        let playerElement = $(`<player>`);
        let pic = p.pic || p.picture && p.picture.thumbnail;
        $(`<img src="${pic}">`).appendTo(playerElement);
        $(`<name>`).html(p.name.first).appendTo(playerElement);
        players.push(new Player(playerElement.appendTo(playersContainer)));
      });
    })
  }
  function updatePlayers(data){
    let playersContainer = document.getElementById('players');
        playersContainer = d3.select(playersContainer);
    let players = playersContainer.selectAll('player').data(data||[], d => d.id+d.scribbler);
        players.enter().append('player').each(Player.create);
        players.exit().remove();
  }
  function artificialActivities(){
    let baseFrequency = 1;
    let chosenPlayer = myself.players[Math.floor(Math.random() * myself.players.length)];
    if(!chosenPlayer) return false;
    chosenPlayer.says(getRandomMessage());
    clearInterval(myself.artificialInterval);
    myself.artificialInterval = setInterval(() => {
      setTimeout(artificialActivities, Math.random() * 3000);
    }, 3000)
    
  }
  function getRandomUsers(number){
    return Promise.resolve({results: [
      {picture: {thumbnail: ''}, name: {first: "Jim", last: "Smith"}},
      {picture: {thumbnail: ''}, name: {first: "Andy", last: "Newman"}},
      {picture: {thumbnail: ''}, name: {first: "Brad", last: "Pitt"}},
      {picture: {thumbnail: ''}, name: {first: "Bruce", last: "Willis"}},
    ]});
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
    }).catch(e => {
      let messages = ['wow','cool','ok','wtf','omg','lol','rofl','idk','idc','stfu','stfd','lmao','roflmao','dude...','duh','haha','hahhaha','ha!','da fuq?'];
      return messages[Math.floor(Math.random() * messages.length)];
    })
  }
  function initAudio(){
    var actx = actx || new AudioContext();
    audio.play = (buffer, controller) => {
        if(buffer === undefined) return false;
        let _defaults = {loop: false, volume: 1, src: {}};
        controller = controller && Object.assign({}, _defaults, controller) || _defaults;
        if(typeof buffer == "number") buffer = audio.buffers[buffer];
        let src = actx.createBufferSource();
        //let srcOsc = actx.createOscillator();
        let srcGain = actx.createGain();
        //srcOsc.frequency.setValueAtTime(1, actx.currentTime);
        srcGain.gain.setValueAtTime(controller.volume, actx.currentTime);
        src.buffer = buffer;
        src.loop = !!controller.loop;
        src.loopStart = controller.loop && controller.loop[0];
        src.loopEnd = controller.loop && controller.loop[1];
        src.connect(srcGain);
        srcGain.connect(actx.destination);
        //src.connect(actx.destination);
        src.start(0);
        src.onended = () => {
            src.buffer = null;
            src.disconnect();
        };
        controller.volume = (v) => {
          srcGain.gain.setValueAtTime(v, actx.currentTime);
        }
        controller.speed = (v) => {
          src.playbackRate.setValueAtTime(v, actx.currentTime);
        }
        controller.src = src;
        controller.stop = controller.stop || (() => {
          controller.loop = false;
          controller.src.stop();
        })
        return controller;
    }
    audio.stop = () => {
      audio.threads.forEach(t => {
        t.stop;
        t.buffer = null;
      });
      audio.threads = [];
    }
    let bufferNames = ['Bell-01','Bell-02','Boom-01','Boom-02','Draw-02','Win-01','Win-02','Win-03','Win-04','Win-05','Win-06','Win-07'];
    let audioBuffers = bufferNames.map(b => {
        return new Promise(res => {
            var req = new XMLHttpRequest();
            req.open('GET','/audio/'+b+'.mp3');
            req.responseType = 'arraybuffer';
            req.onload = () => {
                actx.decodeAudioData(req.response).then(res)
            }
            req.send();
        })
    })
    return Promise.all(audioBuffers).then(b => {
        audio.effects = {};
        audio.buffers = audioBuffers.map((_b,i) => {
          let nameParts = bufferNames[i].split('-');
          let name = nameParts[0];
          let number = parseInt(nameParts[1]);
          audio.effects[name] = (audio.effects[name]||[]).concat(b[i]);
          return b[i]
        });
    })
    initAudio = () => Promise.resolve(true);
  }
  return myself;
})();
class Baseboard {
  constructor(parent){
    this.template = document.importNode(document.querySelector('template#leaderboard').content.cloneNode(true), true);

  }
}
/**
 * Leaderboard 
 */
class WordBoard{
  constructor(wordChoices){
    this.template = getTemplate('board');
    this.container = this.template.querySelector('.board');
    this.container.innerHTML = '';
    let wordButtons = d3.select(this.container)
      .selectAll('button')
      .data(wordChoices)
  
    let enterWordButtons = wordButtons.enter().append('button');
    let exitWordButtons = wordButtons.exit().remove();
    wordButtons.merge(enterWordButtons)
      .html(d => d.word); 
    Object.defineProperty(this.container, 'component', {value: this});
    return this.container;
  }
}
class Leaderboard {
  constructor(parent){
    this.template = getTemplate('board');
    this.lbContainer = this.template.querySelector('.board');
    this.lbpContainer = this.template.querySelector('.players');
    this.lbtContainer = this.template.querySelector('time');
    if(parent) $(this.lbContainer).appendTo(parent)
  }
  get waitingPlayersElement(){
    return self.waiting_players;
  }
  update(room,timeLeft){
    this.lbpContainer.style.height = (((room.seats * 30) / 2) >> 0) + 10;
    let seatList = new Array(room.seats).fill({}).map((v,i) => Object.assign({}, room.playerList[i] || {}, room.playerStats[i]));
    //room.playerList.forEach(p => seatList.splice(room.playerSeats[p.id]-1, 1, p));
    this.ticker(timeLeft);
    let entering, cards;
    let waitingPlayers = d3
      .select(this.lbpContainer)
      .selectAll('li')
      .data(seatList);
    
    entering = waitingPlayers.enter().append('li');
    waitingPlayers.merge(entering).call(updateFlipper);
    //updating = waitingPlayers.selectAll('> div');
    function updateFlipper(selection){
      cards = selection
        .selectAll('div')
        .data(d => [d]);
      entering = cards.enter().append('div').call(card => {
        card.append('span').classed('front',true);
        card.append('span').classed('back',true);
      });
      //.classed('flipped',d => !!d.id);
      cards.merge(entering).call(updateCard);
    }
    function updateCard(backOfCard){
      backOfCard.classed('flipped',false).transition()
      .delay((d,i,e) => e[i].classList.contains('flipped') ? 1000 : 0)
      .on('end', () => {
        let innerBackOfCard = backOfCard.selectAll('span.back')
          .data(d => [d])
          .selectAll('span.inner-back')
          .data(d => [d], (d,i) => d.id);
        innerBackOfCard.exit().remove();
        innerBackOfCard.enter().append('span').classed('inner-back',true).call(updatePlayer);
        backOfCard
          .each((d,i,e) => {
            if(!d.id) return;
            let sel = d3.select(e[i]);
            sel.transition().delay(Math.random()*1000).on('end', () => sel.classed('flipped',true));
          })

      });

        //.call(d => d3.selectAll(d.nodes()).classed('flipped',d => !!d.id));
        
    }
    function updatePlayer(player){
      player.append('img').attr('src',d => d.pic);
      player.append('span').classed('name',true).text(d => d.name);
    }
    return this.lbContainer;

  }
  ticker(time){
    let el = this.lbtContainer;
    this.tickerInterval && this.tickerInterval.kill();
    this.tickerInterval = createCountdown(time, 1000, tick, done);
    function done(){
      //Done!
    }
    function tick(timeLeft){
      timeLeft = timeLeft/1000;
      el.innerHTML = timeLeft;
      if(timeLeft <= 10){
        el.classList.value = 'clock intense';
      }else{
        el.classList.value = 'clock';
      }
    }
  }
}
