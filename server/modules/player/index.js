const {PRIVATE:P,Coordinator, guid, safeObject} = require('../utils');
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
    Object.defineProperty(this, 'currentRoom', {configurable: true, writeable: true, enumerable: true,
      get: () => P(this).currentRoom,
      set: room => {
        this.send({room});
        return P(this).currentRoom = room;
      }
    });
    Object.assign(this, defaultConfig, config || {});
    return this;
  }
  joinRoom(rid){
   
  }
  get email(){
    return P(this).email;
  }
  set email(v){
    return P(this).email = v;
  }
  get socket(){
    return P(this).socket || global.playerSocketMap.get(this.id) || {on: () => {}, send: ()=>{}};
  }

  set socket(socket){
    let oldSocket = P(this).socket || global.playerSocketMap.get(this.id);
    oldSocket && oldSocket.terminate();
    global.playerSocketMap.set(this.id, P(this).socket = socket);
    socket.on('message', message => {
      if(/^[\[|\{]/.test(message) && (message = JSON.parse(message))){
        let mid = message.mid;
        let keys = Object.keys(message);
        Promise.all(keys
          .map(k => (typeof this[k] == 'function') && Promise.resolve(this[k].call(this, message[k])))
        ).then(results => {
          results.forEach((result,i) => {
            message[keys[i]] = result;
          })
          socket.send(JSON.stringify(Object.assign(message, {mid})));
        });

      }
    });
    
  }
  send(data){
    data = JSON.stringify(safeObject(data));
    this.socket.send(data);
    return 'Sent: ' + data;
  }
  static parse(session, ws){
    session.player = session.player || new Player();
    if(!(session.player instanceof Player)){
      session.player = new Player(session.player);
    }
    if(ws) session.player.socket = ws;
    return session;
  }
}
module.exports = {Player};