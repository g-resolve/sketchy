//Words 
const http = require('http');
const {PRIVATE:P, serialize} = require('../utils');
const fs = require('fs');
let wordAPI = 'http://api.datamuse.com/words';
let wordBankFile = __dirname + '/words.json';
let wordBank = (() => (promise = new Promise(r => done = r)) && {done,promise})()
fs.readFile(wordBankFile, (err, data) => {
  if(err) return wordBank.done([]);
  wordBank.done(JSON.parse(data.toString()));
});
let updateWordBank = (wB) => new Promise(res => {
  wB = wB && Promise.resolve(wB) || wordBank;
  wB.then(wB => fs.writeFile(wordBankFile, JSON.stringify(wB), res))
})

class WordSmith{
  constructor(){return this}
  init(){
    return wordBank.promise;
  }
  get word(){
    return this.init().then((wordBank)=>{
      let wordIndex = Math.floor(Math.random() * wordBank.length);
      let word = wordBank[wordIndex];
      if(word && !word.def){
        let wordObj = {sp: word.word, md: 'fd', max: 1};
        return new Promise(res => 
          http.get(wordAPI + serialize(wordObj), req => {
            let data = '';
            req.on('data', d => data += d);
            req.on('end', d => res(JSON.parse(data).map(w => ({word: w.word, def: w.defs.splice(0,4), freq: parseInt(w.tags[0].split(':')[1])}))));
          })
        ).then(([fetchedWord]) => {
          wordBank[wordIndex].def = fetchedWord.def;
          wordBank[wordIndex].freq = fetchedWord.freq;
          fetchedWord.type = word.type;
          updateWordBank(wordBank);
          return fetchedWord;
        });
      }else{
        return Promise.resolve(word);
      }
    })
  }
}
module.exports = {WordSmith};