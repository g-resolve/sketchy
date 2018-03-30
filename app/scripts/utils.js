self.appURL = new URL(window.location);
self.content = $("#content");
self.overlay = $("#overlay");
self.Q = document.querySelector.bind(document);
self.Qa = document.querySelectorAll.bind(document);
function guid(size) {
    let u = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    if(size){
        return u() + '-' + u();
    }else{
        return u() + u() + '-' + u() + '-' + u() + '-' + u() + '-' + u() + u() + u();    
    }
    
}
function createCountdown(time, interval, tick, done){
    if(!tick) return false;
    let starter, runner, killer;
    let remote = {kill: () => {
        clearTimeout(starter);
        clearTimeout(killer);
        clearInterval(runner);
    }, timeLeft: time};
    let trimTime = time % 1000;
    let timeRemaining = time - trimTime;
    starter = setTimeout(() => {
      remote.timeLeft = timeRemaining;
      runner = setInterval(() => tick(remote.timeLeft-=1000), interval||1000);
      killer = setTimeout(() => {
        clearInterval(runner);
        return done ? done() : true;
      }, timeRemaining);
    }, trimTime);
    return remote;
}
function safeObject(data){
    if(!data){
        data = {};
    }else if(typeof data == 'string'){
        data = {[data]: data}
    }else if(Array.isArray(data) || (typeof data == 'boolean') || (typeof data == 'function')){
        data = {data: data};
    }
    return data;
}
function getAsync(){
    let p = {};
    p.await = new Promise((resolve, reject) => {
        p.success = p.done = p.then = resolve;
        p.fail = reject;
    });
    p.await.success = p.await.done = p.await.then;
    return p; 
}
function getTemplate(name){
    let template;
    try{
        template = document.importNode(document.querySelector('template#'+name).content.cloneNode(true), true);
    } catch(e){}
    return template;
}
$.ajaxSetup({
    cache: true
})
$.fn.removeAll = function(){
    $(`[for='${this.prop('name')}']`).add(this).remove();
}
$.fn.cleanup = function(){
    this.children()
        .toArray()
        .forEach(c => $(`[for='${c.name}']`).add(c).remove());
    
    return this;
}
