
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
    if(el instanceof jQuery){
      //el = el;
    }else if(typeof el == 'object'){
      Object.assign(this, el);
      el = this.element;
    }else{
      el = $(`<player>`);
    }
    this.element = el;
    this.element.instance = this;
    this.element.on('mouseover', () => $(pencil).hide('fast'));
    return this;
  }
  get name(){
    return getOrMake('name').html();
  }
  set name(v){
    return getOrMake('name').html(v);
  }
  getOrMake(tag){
    let element = this.element.children(tag);
    if(!element.length){
      element = $(`<${tag}>`).appendTo(this.element);
    }
    return element;
  }
  says(message){
    message = message && Promise.resolve(message);
    message.then(m => {
      M.add({from: this.name, content: m});
    });
  }
}
class Messenger{
  constructor(){
    this.messages = $("#messages");
  }
  add(m){
    let date = new Date();
    let timestamp = date.getHours() + ":" + ('0' + date.getMinutes()).slice(-2) + ":" + ('0' + date.getSeconds()).slice(-2);
    let message = $(`<message from="${m.from}" timestamp="${timestamp}">`);
    message.html(m.content).prependTo(this.messages);
    this.cleanup();
  }
  cleanup(){
    let messages = this.messages.children().toArray();
    messages.splice(-10);
    this.messages.get(0).scrollTo(0,this.messages.height())
    messages.forEach(m => m.remove());
  }
}
class Socket{
  constructor(token){
    this.guid = guid();
    this.pending = {};
//     this.go('/').then(() => {
//       console.log("Socket path traversed");
//     });
  }
  go(path){
    let promise = getAsync();
    if(!path){ return false }
    if(!/^\//.test(path)){ path = '/' + path }
    let oldSocket = P(this).ws;
    if(oldSocket){ oldSocket.close() }
    let ws = P(this).ws = new WebSocket('ws://' + appURL.hostname + path);
    ws.addEventListener('open',(e) => {
      promise.then(e);
      this.onopen(e);
    });
    ws.addEventListener('close',this.onclose.bind(this));
    ws.addEventListener('message',this.onmessage.bind(this));
    return promise.await;
  }
  onopen(e){
    console.info('Opened:', e.currentTarget.url);
  }

  onclose(e){
    console.info('Closed:', e.currentTarget.url);
  }
  subscribe(el, method, callback){
    if(!el || !callback) return false;
    let subs = P(this).subscriptions = P(this).subscriptions || {};
    subs[method] = [].concat.apply(subs[method]||[], [el]);
    el.addEventListener(method, callback);
  }
  onmessage({data:message}){
    if(!/^[\[|\{]/.test(message)) return console.warn("Invalid message received");
    message = JSON.parse(message);
    let pending;
    if(message.mid && (pending = this.pending[message.mid])){
      pending.done(message);
    }else{
      Object.keys(message).forEach(k => {
        let eventData = message[k];
        let subscribers, subs = P(this).subscriptions;
        if(subscribers = subs[k]){
          subscribers.forEach(sub => sub.dispatchEvent(new CustomEvent(k, {detail: eventData})))
        }
        if(typeof this['on'+k.toLowerCase()] == 'function'){
          this['on' + k.toLowerCase()](eventData);
        }
        let customEvent = new CustomEvent(k.toLowerCase(), {detail: eventData});
        window.dispatchEvent(customEvent);
        
      })
    }
  }
  onrooms(rooms){
    
  }
  onguid(guid){
    this.guid = guid;
  }
  send(message){
    if(!P(this).ws.readyState) return Promise.resolve(false);
    let confirm = getAsync();
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
    return confirm.await;
    //console.log(api.readyState);
    
  }
}
const P = new PRIVATE();
const M = new Messenger();
const S = new Socket();