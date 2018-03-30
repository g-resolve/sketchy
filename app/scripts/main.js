self.main = (() => {
  let myself = {};
  myself.bootstrap = (args) => {
    return initAudio()
      .then(() => S.go('rooms'))
      .then(S.subscribe.bind(S, Q('#rooms'), 'rooms', populateRooms));
  }
  function initAudio(){
    return Promise.resolve();
  }
//   myself.bootstrap = function(params = {}){
//     initAudio()
//     .then(params.start)
//     .then(started => {

//     });




    //listRooms();
    /*
    wrapper = document.querySelector('#wrapper');
    canvasWrapper = document.querySelector('#canvas');
    canvas = document.querySelector('canvas');
    pencil = document.querySelector('#pencil');
    messageKnob = document.querySelector("#knob");
    playerWrapper = document.querySelector('#players');
    messageKnob.addEventListener('mousedown', startDragKnob);
    canvasWrapper.addEventListener('mousedown', e => {});
    window.addEventListener('mousemove', handleMouseMove);
    ctx = canvas.getContext('2d');
    S.onlivepaint = redraw;

    canvasWrapper.addEventListener('mouseup', e => {});
    injectPlayers().then(artificialActivities);
    resetBounds();
    windowEvents();
    */
//   };

//   myself.empty = () => Router.clearTemplates() && myself;
//   myself.show = (template, options={}) => (parent = options.overlay?overlay.cleanup():content) && Router.getTemplate(template).then(t => t.appendTo(parent)).then(t => {
//     if(!options || !options.overlay) content.attr('class','p' + content.children().toArray().indexOf(t.get(0)));
//   })
//   myself.cleanup = template => {
//     $(`link[for='${template}'], .wrapper.${template}`).remove();
//     let children = content.children().toArray();
//     let index = (content.attr('class')||'').slice(1);
//     if(!children[index] && children.length){
//       content.attr('class', 'p' + (children.length-1));
//     }
//   };
//   myself.showlogin = () => Router.getTemplate('login').then(html => {
//     $('<section>').html(html).appendTo(content);
//   })

  function populateRooms({target:el,detail:rooms}){
    rooms = rooms.map(room => 
      $(`<room>`).append(() => Object.keys(room).map(k => 
        $(`<${k} value="${room[k]}">`).html(room[k])))
      .on('click',R.go.bind(R, '/room/' + room.id, false)));
    $("#rooms").append(rooms); 
  }
  return myself;
})();
