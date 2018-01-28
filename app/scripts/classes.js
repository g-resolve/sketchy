
const DEFAULT_FPS = 1000;
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
class DrawBuffer extends Array{
  constructor(interval){
    super();
    this.interval = Math.floor(1000 / (interval || DEFAULT_FPS));
    this.then = this.now = Date.now();
    this.stopped = false;
    this.now = false;
    return this;
  }
  start(){
    if(!this.length) return false; 
    requestAnimationFrame(this.start.bind(this));
    this.now = Date.now();
    let delta = this.now - this.then;
    if ((delta > this.interval) && S) {
      this.then = this.now - (delta % this.interval);
      let inkDrop = this.shift();
      S.send(inkDrop).then();
      //inkDrop.livePaint.buttons && console.log(inkDrop.livePaint.currX, inkDrop.livePaint.currY, delta, this.interval, (delta % this.interval));
    }
  }
  stop(){
    return this.stopped = true;
  }
  queue(data){
     data && this.push(data);
     this.start(true);
  }
}
class Player{
  constructor(el){
    this.element = this.e = el;
    this.element.on('mouseover', () => $(pencil).hide('fast'));
    return this;
  }
  says(message){
    message = message && Promise.resolve(message);
    message.then(m => {
      this.e.message = this.e.message || $(`<message>`);
      this.e.message.html(m).insertBefore(this.e);
    });
  }
}

class Socket{
  constructor(){
    let ws = P(this).ws = new WebSocket('ws://' + appURL.hostname + '/api');
    this.guid = guid();
    this.pending = {};
    ws.addEventListener('open',this.onopen.bind(this));
    ws.addEventListener('close',this.onclose.bind(this));
    ws.addEventListener('message',this.onmessage.bind(this));
  }
  
  onopen(){}

  onclose(){}

  onmessage({data:message}){
    if(!/^[\[|\{]/.test(message)) return console.warn("Invalid message received");
    message = JSON.parse(message);
    let pending;
    if(message.mid && (pending = this.pending[message.mid])){
      pending.done(message);
    }else{
      Object.keys(message).forEach(k => {
        let eventData = message[k];
        if(typeof this['on'+k.toLowerCase()] == 'function'){
          this['on' + k.toLowerCase()](eventData);
        }
        let customEvent = new CustomEvent(k.toLowerCase(), {detail: eventData});
        window.dispatchEvent(customEvent);
        
      })
    }
  }
  onguid(guid){
    this.guid = guid;
  }
  send(message){
    if(!P(this).ws.readyState) return Promise.resolve(false);
    let confirm = (() => {let done, promise = new Promise(r => done = r); return {done,promise}})();
    let mid = Math.round(Math.random()*Math.pow(20,6)), ws = P(this).ws;
    this.pending[mid] = confirm;
    if(message && (Array.isArray(message) || message.hasOwnProperty || (typeof message == 'string' && !/^[\[|\{]/.test(message)))){
      message.mid = mid;
      message.guid = this.guid;
      message = JSON.stringify(message);
      ws.readyState && ws.send(message);  
    }else{
      console.warn('Invalid data');
    }
    return confirm.promise
    //console.log(api.readyState);
    
  }
}
const P = new PRIVATE();
const S = new Socket();