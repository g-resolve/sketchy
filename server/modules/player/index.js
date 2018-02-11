const {PRIVATE:P,Coordinator, guid} = require('../utils');
const {Room} = require('../rooms');
class Player{
  constructor(config){
    let defaultConfig = {
      id: guid(),
      name: 'Anonymous',
      email: false,
      currentRoom: undefined,
      level: 0,
      gamesPlayed: 0,
      placedFirst: 0,
      placedSecond: 0,
      placedThird: 0,
      guesses: 0,
      correctGuesses: 0,
      kicks: 0,
      banned: false,
      timesFiltered: 0,
      wpm: 0,
      atg: 0,
      lastRoom: undefined

    }
    Object.assign(this, defaultConfig, config || {});
    return this;
  }
  joinRoom(rid){
   
  }
  get socket(){
    return P(this).socket || global.playerSocketMap.get(this.id) || {send: ()=>{}};
  }
  set socket(socket){
    let oldSocket = P(this).socket || global.playerSocketMap.get(this.id);
    oldSocket && oldSocket.terminate();
    P(this).socket = socket;
  }
  send(data){
    console.log('Sent:',data);
    this.socket.send(JSON.stringify(data));
  }
  static parse(session){
    session.player = session.player || new Player();
    if(!(session.player instanceof Player)){
      session.player = new Player(session.player);
    }
    return session;
  }
}
module.exports = {Player};