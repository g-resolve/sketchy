
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

class ROUTER{
    constructor(){
        this.routes = {};
        this.url = new URL(window.location);
        this.path = this.url.pathname;
        [this.base,this.sub] = this.path.split('/').filter(v=>v);
        this.params = Array.from(this.url.searchParams && this.url.searchParams.entries() || []).reduce((obj, e) => {obj[e[0]] = e[1]; return obj},{});
        this.params.subURL = this.sub;
        this.params.baseURL = this.base;
        this.addRoutes({
          '/': {
            view: 'main',
            init(params){
              //Subscribe to rooms in the lobby.
              S.go('rooms').then(() => S.subscribe(Q('#rooms'), 'rooms', ({target:el,detail:rooms}) => {
                rooms = rooms.map(room => 
                  $(`<room>`).append(() => Object.keys(room).map(k => 
                    $(`<${k} value="${room[k]}">`).html(room[k])))
                  .on('click',R.show.bind(R, '/room/' + room.id)));
                $("#rooms").append(rooms); 
              }));
            }
          },
          '/login': {
            init(){
              $('buttons button').on('click', e => {
                $("#login h3").html('Got it!');
                $('buttons').html(`<p>We\'ll log you in using ${e.target.innerHTML}... one moment.</p>`)
                setTimeout(() => window.location.href = "/api/" + e.target.id, 2000);
               //$(`<iframe src="/api/${e.target.id}"></iframe>`).appendTo('#login');
                e.preventDefault();
              })
            },
            view: 'login'
          },
          '/room/:rid': {
            init(args){
              console.log("ROOM/WOW", arguments);
              S.go('room/' + args.vars.rid).then(S.subscribe.bind(S, $('<div>')[0], 'room', ({detail:room}) => {
                  console.info("ROOM JOINED:",room);
              }));
            },
            view: 'room'
          },
          '/account/overview': {
            init(){
              console.log("ACCOUNT/OVERVIEW");
            },
            view: 'account'
          }
        })
    }
    addRoutes(obj){
        for(let k in obj){
            this.routes[k] = obj[k];
        }
        //this.init().then(()=>this.show('/'));
    }
    init(){
        return $.get('/api/user').promise().then(data => {
            if(!data.emails && !data.email){
                return Promise.reject(this.rejectAuth());
            }
            document.body.setAttribute('authorized','');
            this.params.user = data;
            this.solveEntryPoint();
            return this.params.user;
        }, this.rejectAuth.bind(this));
    }
    rejectAuth(){
        return this.show('/');
        //return this.show('/').then(() => this.show('login', {overlay: true}));
    }
    addRoute(path, obj){
        this.routes[path] = obj;
        this.go();
    }
    solveEntryPoint(){
        let overlay = this.params.o;
        let path = this.path;
        overlay = this.show.bind(this, overlay, {overlay});
        path = this.show.bind(this, path);
        path().then(overlay);
    }
    show(path, options={}){
        if(!path) return Promise.reject(false);
        if(options && options.target) options = {};
        let reqPath = path;
        path = this.findPath(path);
        let argsToPass =  Object.assign({},this.params,{vars: path.vars});
        if(!path) return Promise.resolve(false);
        let parent = options.overlay?self.overlay.cleanup():self.content;
        return this.getTemplate(path.view).then(t => t.appendTo(parent)).then(t => {
            if(!options || !options.overlay) self.content.attr('class','p' + self.content.children().toArray().indexOf(t.get(0)));
            let init = path.init.call(null, argsToPass);
            if(!(init instanceof Promise)){ init = Promise.resolve(init) }
            if(options.overlay){
              window.history.pushState(Object.assign({overlay: reqPath}, this.params, options), path.title, (this.currentPath||reqPath) + '?o=' + encodeURIComponent(reqPath));   
            }else{
              window.history.pushState(Object.assign({}, this.params, options), path.title, reqPath);   
              this.currentPath = reqPath;
            }
            return init.then(r => argsToPass);
        });

    }
    go(_path_){
        let path = _path_ || this.path;
        let len = path.length;
        if(!len || len <= 1) path = '/';
        else if(!this.routes[path]) path = this.findPath(path)
        this.traverse(path);
    }
    findPath(needle){
      if(!needle || (needle === '/')) return this.routes['/'];
      let needleParts = needle.split('/').filter(v=>v);
      let hitMap = Object.keys(this.routes).map((k,i) => {
        let parts = k.split('/').filter(v=>v);
        let hits = parts
          .map((p,i) => {
            let vars = false;
            p = p.replace('*','.*');
            if(/^\:/.test(p)){
              vars = {[p.slice(1)]: needleParts[i]};
              p = '.*';
            }
            let matched = needleParts.some(np => p && new RegExp(p, 'i').test(np))
            return {vars, matched};
          }).filter(v=>v.matched);
        let varsObj = hits.map(hit => hit.vars).filter(v=>v).reduce((obj,a) => Object.assign(obj, a), {});
        return {path: Object.assign({}, this.routes[k], {vars: varsObj||{}}), length: hits.length}
      });
      let theHit = hitMap.filter(hit => hit.length).sort((a,b) => a.length > b.length ? 1 : -1).pop();
      
      return theHit ? theHit.path : this.routes['/'];
    }
    clearTemplates(){
        return $('.wrapper,link[for]').remove();
    }
    getTemplate(name){
        let template = $(`.wrapper.${name}`);
        template = template.length && Promise.resolve(template);
        return template ? template : $.ajax({url:`/views/${name}.html`, xhrFields: {withCredentials: true}, type: 'GET'}).promise().then(t => {
            let ss = [$(`link[for=${name}]`),$(`<link rel="stylesheet" href="/css/${name}.css" for="${name}">`)].find(ss => ss.length)
            return new Promise(res => ss.appendTo(document.head).on('load', res.bind(null, $(`<section class="wrapper ${name}">`).prop('name',name).html(t))));
        });
        //return new Promise(res => $("<div>").load(`/views/${name}.html`, res))
    }
    traverse(path, pathObj){
        pathObj = pathObj || this.routes[path] || (path = '/') && {view: 'main', init: () => {}};
        pathObj.init = pathObj.init || (() => {});
        return this.getTemplate(pathObj.view).then(t => !t.prop('isConnected') && t.appendTo(self.content) || t).then(pathObj.init.bind(null, this.params)); //$("#content").load(`/views/${pathObj.view}.html`, data => pathObj.init(this.params))
        //else return pathObj.init();
    }
}
const R = new ROUTER();
const P = new PRIVATE();
const M = new Messenger();
const S = new Socket();