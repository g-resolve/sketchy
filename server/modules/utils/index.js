class PRIVATE extends WeakMap{
  constructor(){
    super();
    let me = this;
    return function(ref){
      let newObj, obj = me.get(ref) || (newObj = {});
      return newObj && me.set(ref,obj) && obj || obj;
    };
  }
}
class Coordinator{
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
function serialize( obj ) {
  return '?'+Object.keys(obj).reduce(function(a,k){a.push(k+'='+encodeURIComponent(obj[k]));return a},[]).join('&')
}
function guid() {
    let u = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return u() + u() + '-' + u() + '-' + u() + '-' + u() + '-' + u() + u() + u();
}
module.exports = {Coordinator: new Coordinator(), PRIVATE: new PRIVATE(), serialize, guid};
