const {PRIVATE:P,Coordinator} = require('../utils');
const {Room} = require('../rooms');
class Player{
  constructor(config){
    Object.assign(this, config);
  }
  joinRoom(rid){
   
  }
  get id(){
    return P(this).id;
  }
  set id(v){
    return P(this).id = v;
  }
  get name(){
    return P(this).name;
  }
  set name(v){
    return P(this).name = v;
  }
  get email(){
    return P(this).email;
  }
  set email(v){
    return P(this).email = v;
  }
  get stats(){
    return P(this).stats;
  }
  set stats(v){
    return P(this).stats = v;
  }
  get photo(){
    return P(this).photo;
  }
  set photo(v){
    return P(this).photo = v;
  }
  get room(){
    return P(this).room;
  }
  set room(v){
    return P(this).room = v;
  }
}
module.exports = {Player};