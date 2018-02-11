
const {Room} = require('../rooms');
const fs = require('fs');
const DEFAULT_ROOM_SEED = 5;
class Coordinator{
  constructor(seed){
    this.rooms = [];
    this.lobby = [];
    seed = seed || DEFAULT_ROOM_SEED;
    this.roomRoster.then(rooms => {
        if(!rooms.length){
            rooms = new Array(seed).fill({})
        }
        this.rooms = rooms.map(r => new Room(r));
    });
  }
  addListener(){
    
  }
  get rosterFile(){ return __dirname + '/rooms.json'}
  set roomRoster(r){
    return new Promise(res => fs.writeFile(this.rosterFile, JSON.stringify(r), res))
  }
  get roomRoster(){
    let roomRoster = (() => (promise = new Promise(r => done = r)) && {done,promise})()
    fs.readFile(this.rosterFile, (err, data) => {
      if(err) return roomRoster.done([]);
      let str = data.toString();
      roomRoster.done(JSON.parse(str||'{}'));
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
module.exports = {Coordinator: new Coordinator()};