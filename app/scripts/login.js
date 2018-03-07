var login = (()=>{
  let myself = {};
  myself.bootstrap = () => {
    debugger;
    let dismiss = e => {
      $("#overlay").cleanup();
      window.removeEventListener('keydown', dismiss);
    };
    window.addEventListener('keydown', dismiss)

    $('buttons button').on('click', e=>{
      $("#login h3").html('Got it!');
      if (e.target.id == 'llogin') {
        $("#overlay").cleanup();
        return e.preventDefault();
      }
      $('buttons').html(`<p>We\'ll log you in using ${e.target.innerHTML}... one moment.</p>`)
      setTimeout(()=>window.location.href = "/api/" + e.target.id, 500);
      e.preventDefault();
    });
  }
  return myself;
})();
