const {PRIVATE:P,Coordinator, guid, safeObject} = require('../utils');
const {Room} = require('../rooms');
const playerDB = global.DB.addCollection('players', {indices: ['email','id']});
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
    config = config || {};
    delete config.$loki;
    delete config.meta;
    config.email = config.email || config.emails && config.emails[0].value;
    config = (() => {
      let player;
      if(config.email){
        player = playerDB.findOne({$or: [
          {id: config.id},
          {email: config.email}
        ]});
        if(!player){
          player = playerDB.insert(config);
        }
        return player;
      }
      return config;
    })();

    Object.assign(this, defaultConfig, config);
    return this;
  }
  joinRoom(rid){
   
  }
  get currentRoom(){
    return P(this).currentRoom;
  }
  set currentRoom(room){
    room && this.send({room:room.clean});
    return P(this).currentRoom = room;
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
  message(){
    return this.messageRoom.apply(this, [...arguments])
  }
  messageRoom(content){
    return this.currentRoom && this.currentRoom.message({content, from: this});
  }
  vote(vote){
    return this.currentRoom && this.currentRoom.vote({vote, voter: this});
  }
  ping(){
    return this.currentRoom && this.currentRoom.resetKickTimer(this);
  }
  send(data){
    console.log('Update',this.name,':',data);
    data = JSON.stringify(safeObject(data));
    if(this.socket.readyState == 1){
      this.socket.send(data);  
      return 'Sent: ' + data;
    }
    return 'Socket not avaialble for ' + this.name;
    
    
  }
  static parse(session, ws){
    session.player = session.player || new Player();
    if(!(session.player instanceof Player)){
      session.player = new Player(session.player);
    }
    if(ws){
      session.player.socket = ws;
      ws.player = session.player;
    }
    return session.player;
  }
}
module.exports = {Player};