const {WordSmith} = require('../words');
const {PRIVATE:P, Coordinator, guid} = require('../utils');
const {Player} = require('../player');
const fs = require('fs');
const KICK_TIME = 10000;

const STATES = {
  AWAITING_PLAYERS: 0,
  COUNTDOWN: 1,
  STARTED: 2,
  ENDED: 3
}
class Room{
  constructor(config){
    let id = guid();
    let defaultConfig = {
      id,
      seats: 10,
      rounds: 4,
      currentRound: 1,
      currentWord: false,
      players: [],
      playerStats: {},
      winner: false,
      playersToStart: 1,
      state: STATES.AWAITING_PLAYERS,
      ranked: true,
      turnTime: 10000,
      languageFilter: true,
      startDelay: 10000,
      name: "WeScribble Room " + id
    }
    
    Object.defineProperty(this, 'word', {configurable:true, writeable: true, enumerable: true,
      get(){
        let word = {value:''};
        if(!P(this).wordsForRounds) return word;
        try{
          word = P(this).wordsForRounds[this.currentRound-1];
          word.value = word.word;
        }catch(e){
          console.error('Word fethc error',e);
        }
        return word;
      }
    })
    Object.defineProperty(this, 'players', {configurable: true, writeable: true, enumerable: true,
      get(){
        let obj = {
          ids: P(this).players && (Array.from(P(this).players.values())||[]).map(p => p.id),
          value: P(this).players && Array.from(P(this).players.values()) || [],
          delete: player => {
            if(!(player instanceof Player)){
             player = P(this).players.get(player);
            }
            player.currentRoom = undefined;
            P(this).players.delete(player.id);
            console.log("Deleting player", player);
            this.updateStatus();
          },
          get(id){
            return id ? P(this).players.get(id) : false
          },
          add: player => {
            if(player instanceof Player){
              let existing = P(this).players.get(player.id);
              if(existing){
                clearTimeout(existing.kickTimer);
              }
              P(this).players.set(player.id, player);
              player.currentRoom = this;
              this.resetKickTimer(player);
              this.updateStatus();
              return player;
            }
            return false;
          }
        }
        Object.defineProperty(obj, 'value', {enumerable: false});
        return obj;
      },
      set(v){
        if(Array.isArray(v) && v.every(p => p instanceof Player)){
          v = v.map(v => [v.id,v]);
          return P(this).players = new Map(v);
        } else if(v instanceof Player){
          return P(this).players.set(v.id, v);
        }
        else return false;
      }
    });
    config.turnTime = 60000;
    config.rounds = 10;
    config.currentRound = 1;
    config.startDelay = 5 * 1000;
    Object.assign(this, defaultConfig, config||{});

    return this;
  }
  get WS(){
    P(this).WS = P(this).WS || new WordSmith();
    return P(this).WS;
  }
  get newWord(){
    return this.WS.word;
  }
  get currentWord(){
    return P(this).currentWord;
  }
  set currentWord(v){
    return P(this).currentWord = v;
  }
  get playerCount(){
    return this.players.value.length;
  }
  get isFull(){
    return this.playerCount >= this.seats;
  }
  get isComplete(){
    return this.currentRound >= this.rounds;
  }
  get wordsForRounds(){
    let existingWords = P(this).wordsForRounds;
    let promises = existingWords && existingWords.length ? existingWords: new Array(this.rounds).fill().map(r => this.newWord);
    return Promise.all(promises).then(r => P(this).wordsForRounds = r)
  }
  get wordStrategies(){
    let wordsForRounds = P(this).wordsForRounds;
    if(!wordsForRounds || !wordsForRounds.length) return false;
    return wordsForRounds.map(wfr => this.wordStrategy(wfr.word))
  }
  get wordStrategy(){
    return function(word){
      word = Array.from(word||this.word.value);
      return word.reduce((r,v,i,a) => {
            let num = 1 - (Math.pow(i,1.25) / a.length);
            if(num < 0) return r;
            let cos = Math.cos(num) * this.turnTime;
            let revealAt = Math.round(cos/1000)*1000;
            //console.log(r[i-1]);
            if(revealAt >= this.turnTime) revealAt -= r[i-1] ? (this.turnTime - r[i-1].revealAt)/2 : 1000;
            if(r.find(r => r && r.revealAt == revealAt)) return r;
            let letterPos = Math.random()*word.length>>0;
            let obj = {revealAt, letterPos, revealLetter: word.splice(letterPos, 1)}
            r.push(obj);
            return r;
        },[])
      }.bind(this)
  }
  set wordStrategy(v){
    delete P(this).wordStrategy
  }
  get $loki(){}
  set $loki(v){}
  get meta(){}
  set meta(v){}
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
  }
  killDrawClock(){
    clearTimeout(P(this).drawClock);
  }
  startCountdown(){
    return this.wordsForRounds.then(words => {
      if(this.state == STATES.AWAITING_PLAYERS){
        this.broadcast({startCountdown: this.startDelay});
        this.countdownStartedAt = Date.now();
        this.state = STATES.COUNTDOWN;
      }else if(this.state == STATES.COUNTDOWN){
        this.broadcast({startCountdown: this.startDelay - (Date.now() - this.countdownStartedAt)});
      }
      P(this).startTimeout = P(this).startTimeout || setTimeout(() => this.start(), this.startDelay);
    })
  }
  start(){
    let canStart = this.players.value.length >= this.playersToStart;
    if(this.state == STATES.STARTED || !canStart){
      console.log('Cannot start');
      this.updateStatus();
      return false;
    } 
    console.log("STARTING");
    this.currentRound = 0;
    this.startRound({start:this});
    return this;
  }
  queueRevelation(roundNumber){
    [this.wordStrategies[roundNumber]].forEach(ws => {
      //Iterate through strategy and queue revelations
      ws.forEach(wsi => {
        //Queue on the word strategy item
        setTimeout(() => this.broadcast({reveal: wsi}), wsi.revealAt);
      })
    })
  }
  startRound(toBroadcast){
      this.state = STATES.STARTED;
      this.resetDrawClock();
      this.queueRevelation(this.currentRound++);
      toBroadcast = toBroadcast || {next:this};
      this.broadcast(toBroadcast);
  }
  endRound(){
    console.log(this.name + ": Ending Round");
    let toBroadcast = {};
    if(this.isComplete){
      this.state = STATES.ENDED;
      this.clearWords();
      toBroadcast = {end:this};
    }else{
      this.startRound();
    }
    this.updateStatus(toBroadcast);
  }
  save(){

  }

  addPlayer(player){
    this.players.add(player);
    this.startCountdown();
    return player;
  }
  updateStatus(toBroadcast){
    console.log("Updating state");
    if(!this.players.value.length){
      console.log("Awww, everyone left. :(");
      clearTimeout(P(this).startTimeout);
      delete P(this).startTimeout;
      this.killDrawClock();
      this.state = STATES.AWAITING_PLAYERS;
    }else{
      toBroadcast && this.broadcast(toBroadcast);
    }
  }
  resetKickTimer(player){
    let kickPlayer = () => {
      let renewedSocket = global.playerSocketMap.get(player.id);
      let renewedPlayer = renewedSocket && renewedSocket.player;
      if(renewedPlayer && (player.socket.readyState >= 2)){
        this.players.delete(player);
      }
    }
    clearTimeout(player.kickTimer);
    player.kickTimer = setTimeout(kickPlayer, KICK_TIME);
    return 'Kick timer reset for ' + KICK_TIME;
  }
  message(m){
    console.log("\r\nMessage:", m, "\r\nRecipients:", this.players.value);
    return "I done did it!";
  }
  broadcast(m){
    this.players.value.forEach(p => {
      p.send(m);
    })
  }
}
module.exports = {Room}