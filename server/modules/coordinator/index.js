const {Room} = require('../rooms');
const fs = require('fs');
const DEFAULT_ROOM_SEED = 13;
const roomDB = global.DB.addCollection('rooms', {indices: ['id']});
class Coordinator{
  constructor(seed){
    this.rooms = new Map();
    this.lobby = new Map();
    seed = seed || DEFAULT_ROOM_SEED;
    let storedRooms = roomDB.data;
    if(!storedRooms.length){
        storedRooms = new Array(seed).fill({}).map(r => new Room(r));
        roomDB.insert(storedRooms);
        global.DB.saveDatabase(e => {
          debugger;
        });
        storedRooms.forEach(sr => this.rooms.set(sr.id,sr));
    }else{
      storedRooms.forEach(r => {
        r = new Room(r);
        this.rooms.set(r.id, r);
      });
    }


  }
  addToLobby(player){
    this.lobby.set(player.id, player);
    return Array.from(this.rooms.values());
  }
  getRooms(){
    debugger;
    return Array.from(this.rooms.values());
  }
  addToRoom(player, rid){
    let room = this.rooms.get(rid);
    return room && room.addPlayer(player);
  }
  
  get rosterFile(){ return __dirname + '/rooms.json'}
  set roomRoster(r){
    return new Promise(res => fs.writeFile(this.rosterFile, JSON.stringify(r), res))
  }
  get roomRoster(){
    return Promise.resolve(roomDB.data);
  }
  assignPlayerToRoom(){
    
  }
  removePlayerFromRoom(){
    
  }
  room(r){
    return new Room();
  }
}
module.exports = {Coordinator: new Coordinator()};
