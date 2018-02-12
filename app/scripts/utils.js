self.appURL = new URL(window.location);
self.content = $("#content");
self.overlay = $("#overlay");
self.Q = document.querySelector.bind(document);
self.Qa = document.querySelectorAll.bind(document);
function guid() {
    let u = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return u() + u() + '-' + u() + '-' + u() + '-' + u() + '-' + u() + u() + u();
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
$.fn.cleanup = function(){
    this.children().toArray().forEach(c => $(`link[for='${c.name}']`).add(c).remove())
    return this;
}
