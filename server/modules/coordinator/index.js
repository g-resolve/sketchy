const {Room} = require('../rooms');
const fs = require('fs');
const DEFAULT_ROOM_SEED = 5;
class Coordinator{
  constructor(seed){
    this.rooms = [];
    seed = seed || DEFAULT_ROOM_SEED;
    this.roomRoster.then(rooms => {
        if(!rooms.length){
            rooms = new Array(seed).fill({})
        }
        this.roomRoster = this.rooms = rooms.map(r => new Room(r));
    });
  }
  get rosterFile(){ return __dirname + '/rooms.json'}
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
module.exports = {Coordinator: new Coordinator()};
