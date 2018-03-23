var wait = (()=>{
  let myself = {};
  myself.bootstrap = ({vars:{room,timeLeft}}) => {
    //let q = self.waiting_players.
    //room.seats = 20;
    self.waiting_players.style.height = (((room.seats * 30) / 2) >> 0) + 10;
    let seatList = new Array(room.seats).fill({}).map((v,i) => room.playerList[i] || {});
    //room.playerList.forEach(p => seatList.splice(room.playerSeats[p.id]-1, 1, p));
    ticker(timeLeft);
    let entering, cards;
    let waitingPlayers = d3
      .select(self.waiting_players)
      .selectAll('li')
      .data(seatList);

    
    entering = waitingPlayers.enter().append('li');
    waitingPlayers.merge(entering).call(updateFlipper);
    //updating = waitingPlayers.selectAll('> div');
    function updateFlipper(selection){
      cards = selection
        .selectAll('div')
        .data(d => [d]);
      entering = cards.enter().append('div').call(card => {
        card.append('span').classed('front',true);
        card.append('span').classed('back',true);
      });
      //.classed('flipped',d => !!d.id);
      cards.merge(entering).call(updateCard);
    }
    function updateCard(backOfCard){
      backOfCard.classed('flipped',false).transition()
      .delay((d,i,e) => e[i].classList.contains('flipped') ? 1000 : 0)
      .on('end', () => {
        innerBackOfCard = backOfCard.selectAll('span.back')
          .data(d => [d])
          .selectAll('span.inner-back')
          .data(d => [d], (d,i) => d.id);
        innerBackOfCard.exit().remove();
        innerBackOfCard.enter().append('span').classed('inner-back',true).call(updatePlayer);
        backOfCard
          .each((d,i,e) => {
            if(!d.id) return;
            let sel = d3.select(e[i]);
            sel.transition().delay(Math.random()*1000).on('end', () => sel.classed('flipped',true));
          })

      });

        //.call(d => d3.selectAll(d.nodes()).classed('flipped',d => !!d.id));
        
    }

    
    function updatePlayer(player){
      player.append('img').attr('src',d => d.pic);
      player.append('span').classed('name',true).text(d => d.name);
    }
    return Promise.resolve(document.querySelector('#wait'));
  }
  myself.update = myself.bootstrap;
  function ticker(time){
    let trimTime = time % 1000;
    let _wait = document.getElementById('wait');
    let q = _wait.querySelector.bind(_wait);
    let timeEl = q('time');
    time = time - trimTime;
    setTimeout(() => {
      let interval = setInterval(tick, 1000);
      setTimeout(() => clearInterval(interval), time);
      tick();
    }, trimTime);
    function tick(){
      let val = (time -= 1000) / 1000;
      val = val > -1 ? val : 0;
      timeEl.innerHTML = val;
    }
    ticker = () => {};
  }
  return myself;
})();