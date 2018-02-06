const {WordSmith} = require('../words');
const {PRIVATE:P, Coordinator} = require('../utils');
const {Player} = require('../player');
const fs = require('fs');

class Room{
  constructor(config){
    let defaultConfig = {
      seats: 10,
      rounds: 4,
      players: [],
      ranked: true,
      turnTime: 30000,
      languageFilter: true,
      name: "WeScribble Room " + Date.now()
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
  save(){

  }
  get playerCount(){
    return this.players.length;
  }
  get isFull(){
    return this.playerCount >= this.seats;
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