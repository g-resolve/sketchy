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
$.fn.removeAll = function(){
    $(`link[for='${this.prop('name')}']`).add(this).remove();
}
$.fn.cleanup = function(){
    this.children()
        .toArray()
        .forEach(c => $(`link[for='${c.name}']`).add(c).remove());
    
    return this;
}
