self.appURL = new URL(window.location);
self.content = $("#content");
self.overlay = $("#overlay");
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
        this.addRoutes({
          '/': {
            init(params){
              return 'Route initialized';
            },
            view: 'main'
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
          '/room/*': {
            init(args){
              console.log("ROOM/WOW", arguments);
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
            return this.params.user = data;
        }, this.rejectAuth.bind(this)).then(()=>this.show('/'));
    }
    rejectAuth(){
        return this.show('/').then(() => this.show('login', {overlay: true}));
    }
    addRoute(path, obj){
        this.routes[path] = obj;
        this.go();
    }
    show(path, options={}){
        path = this.findPath(path);
        if(!path) return Promise.resolve(false);
        let parent = options.overlay?self.overlay.cleanup():self.content;
        return this.getTemplate(path.view).then(t => t.appendTo(parent)).then(t => {
            if(!options || !options.overlay) self.content.attr('class','p' + self.content.children().toArray().indexOf(t.get(0)));
            let init = path.init.call(null, this.params);
            if(!(init instanceof Promise)){ init = Promise.resolve(init) }
            return init.then(r => this.params);
        })
    }
    go(_path_){
        let path = _path_ || this.path;
        let len = path.length;
        if(!len || len <= 1) path = '/';
        else if(!this.routes[path]) path = this.findPath(path)
        this.traverse(path);
    }
    findPath(needle){
        let chosenPath = Object.keys(this.routes).sort((a,b) => a > b ? 1 : -1).filter(p => new RegExp(needle, 'ig').test(p)).shift();
        return chosenPath ? this.routes[chosenPath] : false;
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
const Router = new ROUTER();