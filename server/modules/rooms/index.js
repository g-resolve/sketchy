const {WordSmith} = require('../words');
const {PRIVATE:P, Coordinator, guid, safeObject} = require('../utils');
const {Player} = require('../player');
const fs = require('fs');
const KICK_TIME = 10000;
const STATES = {
  AWAITING_PLAYERS: 0,
  GAME_START_COUNTDOWN: 1,
  GAME_STARTED: 2,
  NEXT_ROUND_COUNTDOWN: 3,
  GAME_ENDED: 4,
  RESTART_COUNTDOWN: 5
}
class Room{
  constructor(config){
    P(this).players = new Map();
    let override = {turnTime: 20000, rounds: 1, startDelay: 1 * 1000};
    Object.assign(this, this.defaultConfig, config||{}, override);
    return this;
  }
  get defaultConfig(){
    let id = guid();
    return {
      id,
      seats: 10,
      rounds: 4,
      currentRound: 1,
      currentWord: false,
      playerList: [],
      revelations: [],
      playerStats: {},
      winner: false,
      wordMask: '',
      playersToStart: 1,
      gameState: STATES.AWAITING_PLAYERS,
      ranked: true,
      turnTime: 10000,
      languageFilter: true,
      startDelay: 10000,
      nextRoundDelay: 10000,
      name: "Room " + id
    }
  }
  get clean(){
    return Object.keys(this.defaultConfig)
      .reduce((obj,v) => Object.assign(obj, {[v]: this[v]}), {})
  }
  get WS(){
    P(this).WS = P(this).WS || new WordSmith();
    return P(this).WS;
  }
  get newWord(){
    return this.WS.word;
  }
  get word(){
    let word = {value:''};
    let round = this.currentRound - 1;
    if(!P(this).wordsForRounds) return word;
    try{
      word = P(this).wordsForRounds[this.currentRound];
      if(word) word.value = word.word;
    }catch(e){
      console.error('Word fetch error',e);
    }
    return word;
  }
  get wordMask(){
    let word = this.word && this.word.value || '';
    let reveals = this.revelations.map(r => r.letterPos);
    let revealAll = (this.state == STATES.NEXT_ROUND_COUNTDOWN) || (this.state == STATES.GAME_ENDED);
    if(word && word.length){
      word = word.split('').map((l,i) => revealAll || / |\-/.test(l) || reveals.includes(i) ? l : '_');
    }
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
    return this.currentRound >= this.rounds;
  }
  set wordsForRounds(v){
    delete P(this).wordsForRounds;
  }
  get wordsForRounds(){
    let existingWords = P(this).wordsForRounds;
    if(existingWords){ return Promise.resolve(existingWords) }
    return Promise.all(new Array(this.rounds).fill().map(r => this.newWord))
      .then(r => P(this).wordsForRounds = r);
  }
  get wordStrategies(){
    let wordsForRounds = P(this).wordsForRounds;
    if(!wordsForRounds || !wordsForRounds.length) return false;
    return wordsForRounds.map(wfr => this.wordStrategy(wfr.word))
  }
  get wordStrategy(){
    return function(word){
      word = Array.from(word||this.word.value)
        .map((c,i) => !/ |\-/.test(c) && [i,c]).filter(v=>v).slice(1);
      return word.reduce((r,v,i,a) => {
        let half = (this.turnTime / 2);
        let revealAt = Math.round((half + (((half-1000) / a.length) * (i+1)))/1000)*1000;
        let [[letterPos,revealLetter]] = r[1].splice(Math.random()*r[1].length>>0,1);
        let obj = {revealAt,  letterPos, revealLetter};
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
  set state(v){
    let changed = !(v == this.state);
    if(v == STATES.AWAITING_PLAYERS){
      if(changed){
        console.log("Awww, everyone left. :(");
        clearTimeout(P(this).startTimeout);
        delete P(this).startTimeout;
        this.killDrawClock();  
      }
    }
    if(v == STATES.GAME_START_COUNTDOWN){
      if(changed){
        this.countdownStartedAt = Date.now();
        clearTimeout(P(this).startTimeout);
        P(this).startTimeout = setTimeout(() => this.start(), this.startDelay);
      }
      let delta = Date.now() - this.countdownStartedAt;
      if(delta > this.startDelay) this.start()
      this.broadcast({startCountdown: this.startDelay - (Date.now() - this.countdownStartedAt)});
    }
    if(v == STATES.GAME_STARTED){
      
    }
    if(v == STATES.NEXT_ROUND_COUNTDOWN){
      if(changed){
        this.countdownStartedAt = Date.now();
        clearTimeout(P(this).startTimeout);
        P(this).startTimeout = setTimeout(() => this.startRound(), this.nextRoundDelay);
      }
      this.broadcast({nextRoundCountdown: this.nextRoundDelay - (Date.now() - this.countdownStartedAt)});        
    }
    if(v == STATES.GAME_ENDED){
      this.voteRestart();
    }
    if(v == STATES.RESTART_COUNTDOWN){

    }
    return this.gameState = v;
  }
  get playerList(){
    return this.players.map(p => p.id);
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
  get firstRound(){
    console.log("STARTING FIRST ROUND");
    return this.currentRound = 0;
  }
  get updateState(){
    return (state) => {this.state = state;return this}
  }
  get $loki(){}
  set $loki(v){}
  get meta(){}
  set meta(v){}
  addPlayer(player){
    return this.wordsForRounds.then(() => {
       if(player instanceof Player){
        let existing = this.getPlayer(player.id);
        if(existing){
          clearTimeout(existing.kickTimer);
        }
        P(this).players.set(player.id, player);
        player.currentRoom = this;
        this.resetKickTimer(player);
        this.updateStatus(player);
        return player;
      }
      return false;
    }, () => {
      debugger;
    });
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
  start(){
    if(!this.enoughPlayers){ return this.updateStatus() } 
    return this.startRound(this.firstRound);
  }
  startRound(toBroadcast){
    this.currentRound++
    this
      .updateState(STATES.GAME_STARTED)
      .resetDrawClock()
      .queueRevelation()
      .broadcast(toBroadcast||{newRound:this.clean});
  }
  endRound(toBroadcast){
    console.log(this.name + ": Ending Round");
    this.revelations = [];
    if(this.isComplete){
      this.state = STATES.GAME_ENDED;
      this.clearWords();
      toBroadcast = {end:this.clean};
    }else{
      this.state = STATES.NEXT_ROUND_COUNTDOWN;
    }
    toBroadcast = toBroadcast || {endRound:this.clean}
    this.updateStatus();
    this.broadcast(toBroadcast);
  }
  queueRevelation(){
    [this.wordStrategies[this.currentRound-1]].forEach(ws => {
      //Iterate through strategy and queue revelations
      ws && ws.forEach(wsi => {
        //Queue on the word strategy item
        setTimeout(() => {
          this.revelations.push(wsi); 
          this.broadcast({reveal:this.wordMask})
        }, wsi.revealAt);
      })
    })
    return this;
  }
  save(){

  }
  updateStatus(player){
    this.filterPlayers();
    if(!this.enoughPlayers){
      this.state = STATES.AWAITING_PLAYERS;
      //toBroadcast && this.broadcast(toBroadcast);
    }else if([STATES.AWAITING_PLAYERS,STATES.GAME_START_COUNTDOWN].includes(this.state)){
      this.state = STATES.GAME_START_COUNTDOWN;
    }else if(player && (this.state == STATES.GAME_ENDED)){
      this.voteRestart.call(player);
    }
  }
  voteRestart(){
    (this.broadcast||this.send).call(this, {voteRestart: true})
  }
  filterPlayers(){
    this.players = this.players.filter(player => player.socket.readyState !== player.socket.CLOSED);
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
    delete m.from;
    //Object.keys(m).map(k => typeof this[k] == 'function' ? )
    console.log("\r\nMessage:", m, "\r\nRecipients:", this.players);
    return "Complete";
  }
  broadcast(m,pid){
    if(pid instanceof Player){
      pid.send(m);
    }else if(pid){
      let p = this.players[pid];
      if(p) p.send(m);
    }else{
      this.players.forEach(p => {
        p.send(m);
      })      
    }
    return this;
  }
  clear(){

  }

  clearWords(){
    this.wordStrategy = false;
    delete P(this).wordsForRounds;
  }
  resetDrawClock(time){
    this.killDrawClock();
    console.log(this.name + ": Starting Round " + this.currentRound);
    P(this).drawClock = setTimeout(this.endRound.bind(this), time||this.turnTime)
    return this;
  }
  killDrawClock(){
    clearTimeout(P(this).drawClock);
  }

}

module.exports = {Room}