const {WordSmith} = require('../words');
const {PRIVATE:P, Coordinator, guid} = require('../utils');
const {Player} = require('../player');
const fs = require('fs');
const KICK_TIME = 10000;

const STATES = {
  AWAITING_PLAYERS: 0,
  STARTED: 1,
  ENDED: 2
}
class Room{
  constructor(config){
    let id = guid();
    let defaultConfig = {
      id,
      seats: 10,
      rounds: 4,
      currentRound: 1,
      players: [],
      playerStats: {},
      winner: false,
      playersToStart: 1,
      state: STATES.AWAITING_PLAYERS,
      ranked: true,
      turnTime: 10000,
      languageFilter: true,
      name: "WeScribble Room " + id
    }
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
  get playerCount(){
    return this.players.value.length;
  }
  get isFull(){
    return this.playerCount >= this.seats;
  }
  get isComplete(){
    return this.currentRound >= this.rounds;
  }
  get $loki(){}
  set $loki(v){}

  clear(){

  }
  resetDrawClock(time){
    clearTimeout(P(this).drawClock);
    console.log(this.name + ": Starting Round " + this.currentRound)
    P(this).drawClock = setTimeout(this.endRound.bind(this), time||this.turnTime)
  }
  start(){
    let canStart = this.players.value.length >= this.playersToStart;
    if(this.state > 0 || !canStart) return false;
    console.log("STARTING");
    this.currentRound = 1;
    this.resetDrawClock();
    this.broadcast({start:true});
    this.state = STATES.STARTED;
    return this;
  }
  endRound(){
    console.log(this.name + ": Ending Round");
    if(this.isComplete){
      this.state = STATES.ENDED;
      this.broadcast({end:true});
    }else{
      this.currentRound++;
      this.resetDrawClock();
      this.broadcast({next:true});
    }
  }
  save(){

  }

  addPlayer(player){
    this.players.add(player);
    this.start();
    return player;
  }
  updateStatus(){
    console.log("Updating state");
  }
  resetKickTimer(player){
    let kickPlayer = () => {
      let renewedSocket = global.playerSocketMap.get(player.id);
      let renewedPlayer = renewedSocket && renewedSocket.player;
      if(playerRenewed && (player.socket.readyState >= 2)){
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