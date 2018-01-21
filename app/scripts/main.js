var app = (() => {
  let canvas = false, ctx = false, drawing = false;
  let self = {};
  Object.defineProperties(self, {
    canvas: {get: () => canvas},
    ctx: {get: () => ctx},
    drawing: {get: () => drawing}
   });
  self.bootstrap = function(){
   canvas = document.querySelector('canvas');
   ctx = canvas.getContext('2d');
   canvas.addEventListener('mousedown', e => {
     drawing = true;
     
   })
   canvas.addEventListener('mousemove', e => {

   })
   canvas.addEventListener('mouseup', e => {

   })
  };
  function handleMouseDown(){

  }
  return self;
})();

app.bootstrap();