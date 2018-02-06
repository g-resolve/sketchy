self.appURL = new URL(window.location);
self.content = $("#content");
function guid() {
    let u = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return u() + u() + '-' + u() + '-' + u() + '-' + u() + '-' + u() + u() + u();
}
$.fn.cleanup = function(){
    this.children().toArray().forEach(c => $(`link[for='${c.name}']`).add(c).remove())
    return this;
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
    }
    addRoutes(obj){
        for(let k in obj){
            this.routes[k] = obj[k];
        }
        this.go();
    }
    addRoute(path, obj){
        this.routes[path] = obj;
        this.go();
    }
    go(_path_){
        let path = _path_ || this.path;
        let len = path.length;
        if(!len || len <= 1) path = '/';
        else if(!this.routes[path]) path = Object.keys(this.routes).sort((a,b) => a > b ? -1 : 1).find(p => new RegExp(path, 'ig').test(p) || new RegExp(p, 'ig').test(path))
        this.traverse(path);
    }
    clearTemplates(){
        return $('.wrapper,link[for]').remove();
    }
    getTemplate(name){
        let template = $(`.wrapper.${name}`);
        template = template.length && Promise.resolve(template);
        return template ? template : $.get(`/views/${name}.html`).promise().then(t => {
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
const Router = new ROUTER();