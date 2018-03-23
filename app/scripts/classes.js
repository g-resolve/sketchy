
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
  INSTANCE(obj){
    return new PRIVATE()(obj);
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
  constructor(data,index,el){
    if(data && data.element) el = $(data.element);
    else el = $('<player>');
    this.template = document.importNode(self.player_template.content.cloneNode(true), true);
    this.element = el.append(this.template);
    this.element.data('instance',this).on('mouseover', () => $(pencil).hide('fast'));
    Object.assign(this, data||{});
    return data ? data.instance = this : this;
  }
  get element(){
    return P(this).element;
  }
  set element(v){
    return P(this).element = $(v);
  }
  get scribbler(){
    return this.element.attr('scribbler');
  }
  set scribbler(v){
    this.element.attr('scribbler',v?'':null);
  }
  get name(){
    return this.el('name').html();
  }
  set name(v){
    return this.el('name').html(v);
  }
  get pic(){
    return this.el('img').attr('src');
  }
  set pic(v){
    return this.el('img').attr('src',v);
  }
  el(tag){
    return $(tag, this.element);
  }
  says(message){
    message = Promise.resolve(message||'');
    message.then(m => {
      M.add({from: this.name, content: m});
    });
  }
  static create(data, index, el){
    P(self).players = P(self).players || {};
    let player = new Player(Object.assign(data,{element: el[index]}));
    return P(self).players[player.id] = player;
  }
}
class Messenger{
  constructor(){
    //this.messages = $("#messages");
  }
  get messages(){
    return $("#messages");
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
    if(!this.messages.length || (this.messages.length <= 10)) return false;
    messages.splice(10);
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
    this.cleanup();
    let promise = getAsync();
    if(!path){ return false }
    if(!/^\//.test(path)){ path = '/' + path }
    let oldSocket = P(this).ws;
    if(oldSocket){ oldSocket.close(1000); delete P(this).ws;  }
    let ws = P(this).ws = new WebSocket('ws://' + appURL.hostname + path);
    ws.addEventListener('open',(e) => {
      promise.then(this);
      this.startKeepAlive();
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
  cleanup(){
    this.stopKeepAlive();
    let subscriptions = P(this).subscriptions || {};
    Object.keys(subscriptions).forEach(method => {
      let subscribers = subscriptions[method];
      subscribers.forEach(sub => {
        sub.el.removeEventListener(method, sub.callback);
      })
    })
    return P(this).subscriptions = {};

  }
  startKeepAlive(){
    this.send({ping:true});
    return P(this).keepAliveInterval = setInterval(() => this.send({ping:true}), 4000);
  }
  stopKeepAlive(){
    return clearInterval(P(this).keepAliveInterval);
  }
  subscribe(el, method, callback){
    if(!el || !callback) return false;
    let subs = P(this).subscriptions = P(this).subscriptions || {};
    let subscriptions = subs[method] || [];
    let existing = subscriptions.find(sub => sub.el == el);
    if(existing) return true;
    subs[method] = [].concat.apply(subscriptions||[], [{el,callback}]);
    el.addEventListener(method, callback);
    return true;
  }
  onmessage({data:message}){
    if(!(arguments[0] instanceof MessageEvent)) return false;
    /*message = {message: arguments[0]};*/
    if(typeof message == "string" && /^[\[|\{]/.test(message)) message = JSON.parse(message);
    let pending;
    if(message.mid && (pending = this.pending[message.mid])){
      delete message.mid;
      pending.done(message);
    }else{
      Object.keys(message).forEach(k => {

        let eventData = message[k];
        //console.log(`Room: "${k}":`,eventData);
        let subscribers, subs = P(this).subscriptions;
        if(subscribers = subs[k]){
          subscribers.forEach(sub => sub.el.dispatchEvent(new CustomEvent(k, {detail: eventData})))
        }
        if(typeof this['on'+k.toLowerCase()] == 'function'){
          this['on' + k.toLowerCase()](eventData);
        }
//         let customEvent = new CustomEvent(k.toLowerCase(), {detail: eventData});
//         window.dispatchEvent(customEvent);
        //console.log(`Dispatched event [${k}] with data`, eventData);
        
      })
    }
  }
  onrooms(rooms){
    
  }
  onguid(guid){
    this.guid = guid;
  }
  send(message){
    if(!P(this).ws.readyState || !message) return Promise.resolve(false);
    
    let mid = guid('small'), ws = P(this).ws;
    let confirm = getAsync();
    this.pending[mid] = confirm;
    message = Object.assign({}, safeObject(message), {mid});
    //message.guid = this.guid;
    ws.readyState && ws.send(JSON.stringify(message));  
    return confirm.await;
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
        this.params.path = this.path;
        this.addRoutes({
          '/': {
            view: 'main',
            init(args){
              return {params: args.vars, start: () => S.go('rooms')}
            }
          },
          'login': {
            view: 'login'
          },
          'wait': {
            view: 'wait'  
          },
          '/vote-restart':{
            init(args, template){
              return Promise.resolve(template);
            },
            view: 'vote-restart'
          },
          '/room/:rid': {
            init(args){
              return {id: args.vars.rid, start: () => S.go('room/' + args.vars.rid)};
            },
            view: 'room'
          },
          '/account/overview': {
            init(){
              console.log("ACCOUNT/OVERVIEW");
            },
            view: 'account'
          }
        });
        window.addEventListener('popstate', e => {
          delete e.state.user;
          this.solveEntryPoint(Object.assign(this.params, e.state));
        })
    }
    addRoutes(obj){
        for(let k in obj){
            this.routes[k] = obj[k];
        }
    }
    init(){
        return $.get('/api/user').promise().then(data => {
            this.params.user = data;
            Object.assign(ME, data);
            return this.solveEntryPoint(this.params);
        }, () => {debugger})
        .catch(e => {debugger});
    }
    rejectAuth(){
        return this.show('/').then(() => this.show('login', {overlay: true}));
    }
    addRoute(path, obj){
        this.routes[path] = obj;
        this.go();
    }
    solveEntryPoint(params = {}){
        if(!this.params.user.emails && !this.params.user.email){
          //this.params.o = params.o || '/login';
        }else{
          document.body.setAttribute('authorized','');
        }
        $("#overlay,#content").cleanup();
        let overlay = this.show.bind(this, this.params.o, {overlay: this.params.o});
        let path = this.show.bind(this, this.params.path || this.path);
        let templateFill = this.templateFill.bind(this);
        let templateActions = this.templateActions.bind(this);
        return path()
          .then(overlay)
          .then(templateFill)
          .then(templateActions);
          //.then(chain => game.bootstrap(chain))
    }
    close(path){
      $('.'+path).removeAll();
    }
    show(path, options={}, chain){
        if(!path) return Promise.resolve(false);
        //if(path == 'vote-restart'){ debugger }
        if(options && options.target) options = {};
        let reqPath = path;
        path = this.findPath(path);
        if(!path) return Promise.resolve(false);
        path.vars && Object.assign(path.vars, options.params||{});
        let argsToPass =  Object.assign({},this.params,{vars: path.vars});
        let parent = options.overlay?self.overlay.cleanup():self.content;
        return this.getTemplate(path.view).then(t => t.appendTo(parent)).then(t => {
            if(!options || !options.overlay) self.content.attr('class','p' + self.content.children().toArray().indexOf(t.get(0)));
            let _module_ = Object.assign({bootstrap: () => t}, self[path.view]||{});
            let init = (_module_.init || _module_.bootstrap).call(_module_, argsToPass, t);
            //let init = path.init.call(null, argsToPass, t);
            if(!(init instanceof Promise)){ init = Promise.resolve(init) }
            if(options.overlay){
              options.history && window.history.pushState(Object.assign({overlay: reqPath}, this.params, options), path.title, (this.currentPath||reqPath) + '?o=' + encodeURIComponent(reqPath));   
            }else{
              window.history.pushState(Object.assign({}, this.params, options), path.title, reqPath);   
              this.currentPath = reqPath;
            }
            return init.then(r => Object.assign({template: t}, safeObject(chain), safeObject(r)));
        });

    }
    templateFill(chain){
      let user = this.params.user;
      let username, birthday = "";
      try{username = user.user._json.name.familyName;}
      catch(e){ username = user.displayName}
      let greeting = username && "Welcome back" || "Welcome to WeScribble!";
      let parsed = {username, greeting}; 
      $('ws-slot').toArray().forEach(s => {
        let children = Array.from(s.attributes)
          .map(a => (parsed[a.name] && {key: a.name, value:parsed[a.name]}))
          .filter(v=>v)
          .map(c => $(`<span class="${c.key}">${c.value}</span>`))
        children.length && $(s).empty().append(children);
      });
      this.templateFill = () => {};
      return chain;
    }
    templateActions(chain){
      window.addEventListener('onbeforeunload',e => {

      })
      $('h1').on('click', R.go.bind(R, '/', false));
      $('[logout]').on('click', () => window.location.href='/api/logout');
      this.templateActions = () => {};

      return chain;
    }
    go(path,o){
      Object.assign(this.params, {path,o})
      return this.solveEntryPoint()
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
            let matched = needleParts[i] && new RegExp(p, 'i').test(needleParts[i]);
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
        let promise, existing = $(`.wrapper.${name}`);
        if(existing.length){
          return Promise.resolve(existing);
        }else{
          promise = $.ajax({url:`/views/${name}.html`, xhrFields: {withCredentials: true}, type: 'GET'}).promise();
        }
        return promise.then(t => {
            let ss = [$(`link[for=${name}]`),$(`<link rel="stylesheet" href="/css/${name}.css" for="${name}">`)].find(ss => ss.length)
            let jsPromise = new Promise(res => {
              if(self[name] && (self[name].bootstrap || self[name].init)) return res(true);
              $.getScript(`/scripts/${name}.js`).done(res)
              .catch(res.bind(null,false))
            });
            //let js = [$(`script[for=${name}]`),$(`<script async src="/scripts/${name}.js" for="${name}">`)].find(js => js.length)
            let ssPromise = new Promise(res => ss.appendTo(document.head).on('load', res));
            //let jsPromise = new Promise(res => js.appendTo(document.head).on('load', res));
            return Promise.all([ssPromise,jsPromise])
              .then(() => $(`<section class="wrapper ${name}">`).prop('name',name).html(t))
              .catch(e => {debugger;})
        });
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
const ME = new Player();

R.init();