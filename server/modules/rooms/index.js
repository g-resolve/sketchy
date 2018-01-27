const {WordSmith} = require('../words');
const {PRIVATE:P} = require('../utils');
class RoomCoordinator{
  constructor(){

  }
  room(r){
    return new Room();
  }
}
class Room{
  constructor(){
    this.WS = new WordSmith();
    P(this).players = ["Andre", "Zoon"];
  }
  get newWord(){
    return this.WS.word;
  }
  get name(){
    return "Generic Room Name " + Date.now();
  }
  get players(){
    return P(this).players;
  }
}
module.exports = {Room, RoomCoordinator}