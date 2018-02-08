const {WordSmith} = require('../words');
const {PRIVATE:P, Coordinator, guid} = require('../utils');
const {Player} = require('../player');
const fs = require('fs');
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
      currentRound: 0,
      players: [],
      winner: false,
      state: STATES.AWAITING_PLAYERS,
      ranked: true,
      turnTime: 30000,
      languageFilter: true,
      name: "WeScribble Room " + id
    }
    Object.assign(this, defaultConfig, config||{});
  }
  get WS(){
    P(this).WS = P(this).WS || new WordSmith();
    return P(this).WS;
  }
  get newWord(){
    return this.WS.word;
  }
  clear(){

  }
  resetDrawClock(time){
    clearTimeout(P(this).drawClock);
    console.log(this.name + ": Starting Round")
    P(this).drawClock = setTimeout(this.endRound.bind(this), time||this.turnTime)
  }
  start(){
    this.currentRound = 0;
    this.resetDrawClock();
    return this;
  }
  endRound(){
    console.log(this.name + ": Ending Round")
    if(this.isComplete){
      this.state = STATES.ENDED;
    }else{
      this.currentRound++;
      this.resetDrawClock();
    }
  }
  save(){

  }
  get playerCount(){
    return this.players.length;
  }
  get isFull(){
    return this.playerCount >= this.seats;
  }
  get isComplete(){
    return this.currentRound >= this.rounds;
  }
  addPlayer(player){
    if(!player instanceof Player) return false;
    P(this).players.push(player);
  }
  removePlayer(player){
    let players = P(this).players;
    let index = players.indexOf(player);
    if(index > -1){
      players.splice(index, 1);
    }
  }
  get players(){
    return P(this).players || [];
  }
  set players(v){
    if(Array.isArray(v) && v.every(p => p instanceof Player))
      return P(this).players = v;
    else return false;
  }
}
module.exports = {Room}