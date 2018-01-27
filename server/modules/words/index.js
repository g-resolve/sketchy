//Words 
const http = require('http');
const {PRIVATE:P, serialize} = require('../utils');
const fs = require('fs');
let wordAPI = 'http://api.datamuse.com/words';
let wordBank = {};
let wordBankReady = (() => {let promise; new Promise(); }()
fs.readFile(__dirname + '/words.json', (err, data) => {
  if(err) return res(wordBank.words = []);
  wordBank.words = JSON.parse(data.toString());
});

class WordSmith{
  constructor(){
    this.initialize = new 
  }
  init(){
    return new Promise(res)
  }
  get word(){
    let wordIndex = Math.floor(Math.random() * wordBank.words.length);
    let word = wordBank.words 
      && wordBank.words[wordIndex];
    if(word && !word.def){
      let wordObj = {sp: word.word, md: 'fd'};
      return new Promise(res => 
        http.get(wordAPI + serialize(wordObj), req => {
          let data = '';
          req.on('data', d => data += d);
          req.on('end', d => res(JSON.parse(data).map(w => ({word: w.word, def: w.defs.splice(0,4), freq: parseInt(w.tags[0].split(':')[1])}))));
        })
      ).then(fetchedWord => {
        
      });
    }else{
      return Promise.resolve(word);
    }

  }

}
module.exports = {WordSmith};