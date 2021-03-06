const {WordSmith} = require('../words');
const {PRIVATE:P, Coordinator, guid, safeObject} = require('../utils');
const {Player} = require('../player');
const fs = require('fs');
const KICK_TIME = 5000;
const STATES = {
  AWAITING_PLAYERS: 0,
  GAME_START_COUNTDOWN: 1,
  GAME_STARTED: 2,
  START_TURN: 3,
  END_TURN: 4,
  NEXT_TURN_COUNTDOWN: 5,
  PODIUM: 6,
  VOTE_RESTART: 7,
  RESTART_COUNTDOWN: 8,
  GAME_ENDED: 9,
}
const WORD_CHOICES_COUNT = 6;
class Room{
  constructor(config){
    P(this).players = new Map();
    let override = {playersToStart: 1, turnTime: 15000, rounds: 2000, startDelay: 5 * 1000};
    Object.assign(this, this.defaultConfig, config||{}, override);
    return this;
  }
  get defaultConfig(){
    let id = guid();
    return {
      id,
      seats: 10,
      seatsLeft: [],
      //playerSeats: {},
      rounds: 3,
      currentRound: 0,
      currentTurn: 0,
      currentWord: false,
      playerList: [],
      pencilHolder: false,
      playerSequence: [],
      revelations: [],
      playerStats: [],
      winner: false,
      wordMask: '',
      playersToStart: 2,
      gameState: STATES.AWAITING_PLAYERS,
      ranked: true,
      turnTime: 60000,
      languageFilter: true,
      startDelay: 6000,
      breakDelay: 1000,
      nextTurnDelay: 1000,
      name: "Room " + id,
      drawTimeLeft: 0
    }
  }
  get freeSeat(){

  }

  get clean(){
    let cleanObj = Object.keys(this.defaultConfig)
      .reduce((obj,v) => Object.assign(obj, {[v]: this[v]}), {})
     //console.warn("CLEAN OBJ", cleanObj);
     
     try{
       JSON.stringify(cleanObj)
     }catch(e){
       debugger;
     }
    return cleanObj;
  }
  get WS(){
    P(this).WS = P(this).WS || new WordSmith();
    return P(this).WS;
  }
  get newWord(){
    return this.WS.word;
  }
  get word(){
    let word = this.wordsForTurns().value && this.wordsForTurns().value[this.currentRound] || {word:''};
    word.value = word.word;
    return word;
  }
  get wordChoices(){

  }
  set wordChoices(v){

  }
  get wordMask(){
    let chosenWord = P(this).chosenWord;
    if(!chosenWord) return [];
    let word = chosenWord.word;
    let reveals = this.revelations.map(r => r.letterPos);
    let conditions = [STATES.END_TURN, STATES.NEXT_TURN_COUNTDOWN];
    let revealAll = (this.revelations.length > 1) && conditions.includes(this.state);
    //console.log("REVELATIONS", this.revelations, "STATE", this.state);
    if(word && word.length){
      word = word.split('').map((l,i) => revealAll || / |\-/.test(l) || reveals.includes(i) ? l : '_');
    }
    //console.log("WORD MASK", word);
    return word;
  }
  set wordMask(v){}
  get playerCount(){
    return this.players.value.length;
  }
  get isFull(){
    return this.playerCount >= this.seats;
  }
  get isComplete(){
    return this.currentRound >= (this.rounds - 1);
  }
  set wordsForTurns(v){
    delete P(this).wordsForTurns;
  }
  get wordsForTurns(){
    let existingWords = P(this).wordsForTurns;
    let returnObj = {promise: Promise.resolve(existingWords), value: existingWords};
    if(!existingWords){
      returnObj.promise = Promise.all(new Array(this.rounds * this.seats).fill().map(r => this.newWord))
      .then(r => P(this).wordsForTurns = returnObj.value = r);
    }
    return function(){
      return this;
    }.bind(returnObj);
  }
  get wordStrategies(){
    return this.wordsForTurns().promise.then(wfrs => {
      return wfrs.map(wfr => this.wordStrategy(wfr.word))
    });
  }
  get wordStrategy(){
    return function(word){
      word = Array.from(word||'')
        .map((c,i) => !/ |\-/.test(c) && [i,c]).filter(v=>v).slice(1);
      return word.reduce((r,v,i,a) => {
        let half = (this.turnTime / 2);
        let revealAt = Math.round((half + (((half-1000) / a.length) * (i+1)))/1000)*1000;
        let [[letterPos,revealLetter]] = r[1].splice(Math.random()*r[1].length>>0,1);
        let obj = {revealAt, letterPos, revealLetter};
        r[0].push(obj);
        return r;
      },[[],Array.from(word)])[0]
    }.bind(this)
  }
  set wordStrategy(v){
    delete P(this).wordStrategy
  }
  get state(){
    return this.gameState;
  }
  get stateName(){
    return Object.keys(STATES).find(s => STATES[s] == this.gameState)
  }
  /**
   * Main State Monitor
   */
  set state(v){
    let changed = !(v == this.state);
    this.gameState = v;

    //Waiting For Players
    if(v == STATES.AWAITING_PLAYERS){
      if(changed){
        console.log("Awww, everyone left. :(");
        clearTimeout(P(this).startTimeout);
        delete P(this).startTimeout;
        this.killDrawClock();
      }
      this.broadcast({AWAITING_PLAYERS: {room: this.clean}});
    }

    //Start Game Countdown
    if(v == STATES.GAME_START_COUNTDOWN){
      if(changed){
        this.clearWords();
        this.countdownStartedAt = Date.now();
        clearTimeout(P(this).startTimeout);
        P(this).startTimeout = setTimeout(() => this.start(), this.startDelay);
      }
      let delta = Date.now() - this.countdownStartedAt;
      if(delta > this.startDelay){
        clearTimeout(P(this).startTimeout);
        this.start();
      }
      this.broadcast({GAME_START_COUNTDOWN: {room: this.clean, timeLeft: this.startDelay - (Date.now() - this.countdownStartedAt)}});
    }
    
    //End Turn
    if(v == STATES.END_TURN){
      if(changed){
        P(this).nextTurnTimeout = setTimeout(() => this.updateState(STATES.NEXT_TURN_COUNTDOWN), this.breakDelay);
      }
      this.broadcast({END_TURN: {room: this.clean}});
    }
    //Next Turn Countdown
    if(v == STATES.NEXT_TURN_COUNTDOWN){
      if(changed){
        this.pencilHolder = this.nextPencilHolder();
        
        //Give player word choices...
        Promise.all(new Array(WORD_CHOICES_COUNT).fill().map(r => this.newWord))
          .then(wordChoices => {
            P(this).currentWordChoices = wordChoices;            
            this.countdownStartedAt = Date.now();
            clearTimeout(P(this).startTimeout);
            P(this).startTimeout = setTimeout(() => this.startTurn(), this.nextTurnDelay);
            this.broadcast({NEXT_TURN_COUNTDOWN: {room: this.clean, timeLeft: this.nextTurnDelay - (Date.now() - this.countdownStartedAt)}});        
          }); 
      }
    }

    //Vote Restart
    if(v == STATES.VOTE_RESTART){
      this.voteRestart();
    }

    //Restart Countdown
    if(v == STATES.RESTART_COUNTDOWN){

    }

    //Start Game
    if(v == STATES.GAME_STARTED){
      this.broadcast({GAME_STARTED: this.clean});
    }
    
    //End Game
    if(v == STATES.GAME_ENDED){
      this.clearWords();
      this.broadcast({GAME_ENDED:this.clean});
    }
    return v;
  }
  updateStatus(player){
    this.filterPlayers();

    if(!this.enoughPlayers){
      this.state = STATES.AWAITING_PLAYERS;
      //toBroadcast && this.broadcast(toBroadcast);
    }else if([STATES.AWAITING_PLAYERS,STATES.GAME_START_COUNTDOWN].includes(this.state)){
      this.state = STATES.GAME_START_COUNTDOWN;
    }else if(player && (this.state == STATES.VOTE_RESTART)){
      this.voteRestart.call(player);
    }else if(this.state === STATES.GAME_STARTED){
      this.state = STATES.GAME_STARTED;
    }
    console.log("STATE", this.stateName);
    return this;
  }
  get playerList(){
    let players = this.players.map(p => p.clean);
    let scribbler = players.find(p => p.id == this.pencilHolder);
    if(scribbler) scribbler.scribbler = true;
    return players;
  }
  set playerList(v){}
  get players(){
    P(this).players = P(this).players || new Map();
    return Array.from(P(this).players.values());
  }
  set players(v){
    if(Array.isArray(v) && v.every(p => p instanceof Player)){
      v = v.map(v => [v.id,v]);
      P(this).players = new Map(v);
    } else if(v instanceof Player){
      P(this).players.set(v.id, v);
    }
    //this.updateStatus();
    return v;
  }
  get enoughPlayers(){
    return this.players.length >= this.playersToStart
  }
  
  get updateState(){
    return (state = new Number()) => {
      this.state = state;
      return this.updateStatus()
    }
  }
  get $loki(){}
  set $loki(v){}
  get meta(){}
  set meta(v){}

  init(force){
    return P(this).initialized && !force ? Promise.resolve(true) : this.clearWords().wordsForTurns().promise.then(r => {
      return P(this).initialized = true
    });
  }
  addPlayer(player){
    if(player instanceof Player){
      let existing = this.getPlayer(player.id);
      if(existing){
        clearTimeout(existing.kickTimer);
      }
      P(this).players.set(player.id, player);
      this.resetKickTimer(player);
      player.currentRoom = this.updateStatus(player);
      return player;
    }
    return false;
    
  }
  deletePlayer(player){
    if(!(player instanceof Player)){
     player = P(this).players.get(player);
    }
    player.currentRoom = undefined;
    P(this).players.delete(player.id);
    console.log("Deleting player", player);
    this.updateStatus();
  }
  getPlayer(pid){
    return pid ? P(this).players.get(pid) : false
  }
  //START GAME
  start(){
    if(!this.enoughPlayers){ return this.updateStatus() }
    //let randomSeatOrder = new Array(this.players.length).fill().map((v,i) => i+1).sort(i => [1,-1][Math.round(Math.random())]);
    //this.players.forEach( p => this.playerSeats[p.id] = randomSeatOrder.pop());
    //this.seatsLeft = new Array(this.seats).fill().map((v,i) => i+1).slice(this.players.length);
    this.currentRound = this.currentTurn = 0;
    this.playerStats = new Array(this.rounds).fill().map(r => ({}));
    return this.updateState(STATES.NEXT_TURN_COUNTDOWN);
  }
  get firstRound(){
    return this.currentRound = 0;
  }

  startTurn(wordIndex){
    P(this).chosenWord = P(this).currentWordChoices[wordIndex||0];
    delete P(this).currentWordChoices;
    console.log("PencilHolder:", P(this).players.get(this.pencilHolder));
    try{
      this.playerStats[this.currentRound][this.pencilHolder] = this.players.filter(p => p.id !== this.pencilHolder).map(p => ({id: p.id, guessed: false, scribbled: false, points: 0, notes: {}}));
    }catch(e){
      debugger;
    }
    return this
      .resetDrawClock()
      .queueRevelation()
      .updateState(STATES.GAME_STARTED)
      //.then(r => this.broadcast(toBroadcast||{startTurn:this.clean}));
  }
  endTurn(){
    console.log("Ending Turn");
    let newState = STATES.END_TURN;
    let pHolder = this.nextPencilHolder();
    let isComplete = this.isComplete;
    if(isComplete){
      newState = STATES.VOTE_RESTART;
    }else if(!pHolder){
      this.currentTurn = 0;
      this.currentRound++;
    }
    return this.updateState(newState); 
  }
  queueRevelation(){
    this.revelations = [];
    this.wordStrategy(P(this).chosenWord.word).forEach(wsi => 
      //Queue on the word strategy item
      setTimeout(() => {
        this.revelations.push(wsi);
        this.broadcast({REVEAL:this.wordMask});
      }, wsi.revealAt)
    )
    return this;
//     return this.wordStrategies.then(wstrats => {
//       [wstrats[this.currentRound]].forEach(ws => {
//         //Iterate through strategy and queue revelations
//         ws && ws.forEach(wsi => {
//           //Queue on the word strategy item
//           setTimeout(() => {
//             this.revelations.push(wsi); 
//             this.broadcast({reveal:this.wordMask})
//           }, wsi.revealAt);
//         })
//       })
//       return this;
//     })
  }
  nextPencilHolder(){
    return (() => {
      let alreadyPlayed = Object.keys(this.playerStats[this.currentRound]||{});
      let haventPlayed = this.players.filter(p => !alreadyPlayed.includes(p.id));
      let result = haventPlayed.length ? haventPlayed[0].id : false;
      return result;
    })();
  }
  save(){

  }

  filterPlayers(){
    this.players = this.players.filter(player => player && player.id && player.socket && player.socket.readyState !== player.socket.CLOSED);
    //this.broadcast({players: this.playerList});
  }
  resetKickTimer(player){
    let kickPlayer = () => {
      let renewedSocket = global.playerSocketMap.get(player.id);
      let renewedPlayer = renewedSocket && renewedSocket.player;
      if(renewedPlayer && (player.socket.readyState >= 2)){
        this.deletePlayer(player);
      }
    }
    clearTimeout(player.kickTimer);
    player.kickTimer = setTimeout(kickPlayer, KICK_TIME);
    return 'Kick timer reset for ' + KICK_TIME;
  }
  message(m, player){
    m = safeObject(m);
    let from = m.from;
    let methods = m.content;
    let keys = Object.keys(methods);
    let promises = keys
      .map(k => typeof this[k] == 'function' ? this[k](methods[k],from) : false)
    return Promise.all(promises)
      .then(results => results.reduce((obj,v,i) => Object.assign(obj, {[keys[i]]:v}),{}));
  }
  voteRestart(votes){
    this.votes = this.votes || new Map();
    if(!votes){
      (this.broadcast||this.send).call(this, {VOTE_RESTART: true})  
    }else{
      
      let tally = this.playerList.map(p => (this.votes.get(p.id)||{}).restart);
      if((tally.filter(v => v == "yes").length / tally.length) > 0.5){
        this.init(true).then(() => this.updateState(STATES.GAME_START_COUNTDOWN))
      }else if((tally.filter(v => v == "no").length / tally.length) > 0.5){
        this.updateState(STATES.GAME_ENDED);
      }
    }
    return true;
  }
  vote(voteObj){
    if(this.state == STATES.VOTE_RESTART){
      this.votes.set(voteObj.voter.id, voteObj.vote);
      
      //For restart votes
      if(voteObj.vote && voteObj.vote.restart){
        this.voteRestart(this.votes)
      }
      //For other votes
      if(voteObj.vote && voteObj.vote.kick){
        this.voteKick(this.vote);
      }
      return true;
    }
    return false;
  }
  guess(g,p){
    let word = this.word.word.replace(/[^\w\s]/gi,'');
    let guess = g.replace(/[^\w\s]/gi,'');
    let match = new RegExp(word,'i');
    let _return_ = false;
    match = match.test(guess);
    if(match){
      _return_ = () => word;
      let wordsLeft = this.wordMask.length - this.wordMask.filter('_').length;
      guess = {round:this.currentRound, scribbler: this.pencilHolder, player:p.id, wordsLeft, speed: this.currentRoundStartTime - Date.now()};
      let stat = this.playerStats[this.currentRound][this.pencilHolder].find(ps => ps.id == p.id);
      stat.guessed = guess;
    }else{
      _return_ = () => this.broadcast({MESSAGE: {from: p.id, value: g}});
    }
    g = Player.filter(g).message;
    return _return_() & true;
  }
  chooseWord(i){
    clearTimeout(P(this).startTimeout);
    this.startTurn(i);
  }
  broadcast(m,pid){
    let players = [];
    if(pid instanceof Player){
      players.push(pid);//pid.send(m);
    }else if(pid){
      players.push(P(this).players.get(pid));
    }else{
      players = this.players;
    }
    this.players.forEach(p => {
      let messageContent = Object.values(m)[0];
      if((p.id == this.nextPencilHolder()) && messageContent && P(this).currentWordChoices){
        Object.assign(messageContent.room||messageContent, {wordChoices: P(this).currentWordChoices});
      }
      p.send(m);
    })      
    
    return this;
  }
  clear(){

  }

  clearWords(){
    this.wordStrategy = false;
    delete P(this).wordsForTurns;
    return this;
  }
  resetDrawClock(time){
    this.killDrawClock();
    //console.log(this.name + ": Starting Round " + this.currentRound);
    P(this).drawClockStarted = Date.now();
    P(this).drawClock = setTimeout(this.endTurn.bind(this), time||this.turnTime)
    //P(this).drawClock = setTimeout(this.endRound.bind(this), time||this.turnTime)
    return this;
  }
  get drawTimeLeft(){
    if(!P(this).drawClockStarted) return 0;
    let timeLeft = this.turnTime  - (P(this).drawClockStarted - Date.now());
    return timeLeft < 0 ? 0 : timeLeft;
  }
  set drawTimeLeft(v){}
  killDrawClock(){
    clearTimeout(P(this).drawClock);
  }

}

module.exports = {Room};