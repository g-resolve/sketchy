const appURL = new URL(window.location);
function guid() {
    let u = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return u() + u() + '-' + u() + '-' + u() + '-' + u() + '-' + u() + u() + u();
}
class ROUTER{
    constructor(){
        this.routes = {};
        this.url = new URL(window.location);
        this.path = this.url.pathname;
        [this.base,this.sub] = this.path.split('/').filter(v=>v);
        this.params = Array.from(this.url.searchParams.entries()).reduce((obj, e) => {obj[e[0]] = e[1]; return obj},{});
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
        let path = Object.keys(this.routes).sort((a,b) => a > b ? -1 : 1).find(path => new RegExp(_path_||path, 'ig').test(_path_?path:this.path))
        this.traverse(path);
    }
    traverse(path, pathObj){
        pathObj = pathObj || this.routes[path] || (path = '/') && {view: 'main', init: () => {}};
        pathObj.init = pathObj.init || (() => {});
        return $("#content").load(`/views/${pathObj.view}.html`, data => pathObj.init())
        //else return pathObj.init();
    }
}
const Router = new ROUTER();