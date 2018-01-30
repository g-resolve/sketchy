const {WordSmith} = require('../words');
const {PRIVATE:P} = require('../utils');
const fs = require('fs');
class RoomCoordinator{
  constructor(){
    this.rosterFile = __dirname + '/rooms.json';
  }
  set roomRoster(r){
    return new Promise(res => fs.writeFile(this.rosterFile, JSON.stringify(r), res))
  }
  get roomRoster(){
    let roomRoster = (() => (promise = new Promise(r => done = r)) && {done,promise})()
    fs.readFile(this.rosterFile, (err, data) => {
      if(err) return roomRoster.done([]);
      roomRoster.done(JSON.parse(data.toString()));
    });
    return roomRoster.promise;
  }
  assignPlayerToRoom(){

  }
  removePlayerFromRoom(){

  }

  room(r){
    return new Room();
  }
}
class Room{
  constructor(config){
    if(config){
      Object.apply(this, config);
    }
    P(this).players = ["Andre", "Zoon"];
  }
  get WS(){
    P(this).WS = P(this).WS || new WordSmith();
    return P(this).WS;
  }
  get newWord(){
    return this.WS.word;
  }
  get name(){
    return "Generic Room Name " + Date.now();
  }
  clear(){

  }
  save(){

  }
  addPlayer(){

  }
  removePlayer(){
    
  }
  get players(){
    return P(this).players;
  }
}
module.exports = {Room, RoomCoordinator}