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
    Object.apply(this, defaultConfig, config||{});
  }
  get WS(){
    P(this).WS = P(this).WS || new WordSmith();
    return P(this).WS;
  }
  get newWord(){
    return this.WS.word;
  }
  get name(){
    return P(this).name || "Generic Room Name " + Date.now();
  }
  clear(){

  }
  save(){

  }
  addPlayer(player){
    
  }
  removePlayer(){
    
  }
  get players(){
    return P(this).players;
  }
  set players(v){
    if(Array.isArray(v) && v.every(p => p instanceof Player))
    return P(this).players = v;
  }
}
module.exports = {Room}