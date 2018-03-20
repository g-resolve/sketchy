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
function serialize( obj ) {
  return '?'+Object.keys(obj).reduce(function(a,k){a.push(k+'='+encodeURIComponent(obj[k]));return a},[]).join('&')
}
function guid() {
    let u = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return u() + u() + '-' + u() + '-' + u() + '-' + u() + '-' + u() + u() + u();
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

module.exports = {PRIVATE: new PRIVATE(), serialize, guid, safeObject};
