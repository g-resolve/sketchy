/*
FACEBOOK
--------
APP_ID: 215154845701552
APP_SECRET: c9a84ab75709e2a2831f3233eac9818e

TWITTER
-------
APP_ID: 70pf0IArGVNEMaFFdjd5QruRsA
APP_SECRET: mf4XfEowjqRP7TI8wKdpweN7SjZT21wXsHqRhPyKP4nE4P2abc

GOOGLE
------
APP_ID: 325591313256-te9bgr41u58ne2tk2gk0il9a61f5sqsk.apps.googleusercontent.com
APP_SECRET: B_L6c9wLcSqMGKCjA74M8o9f
*/
module.exports = {
  FConfig: {
    clientID: "215154845701552",
    clientSecret: "c9a84ab75709e2a2831f3233eac9818e",
    callbackURL: "http://ctscribble.andrezoon.com/api/facebook/callback"
  },
  TConfig: {
    consumerKey: "70pf0IArGVNEMaFFdjd5QruRsA",
    consumerSecret: "mf4XfEowjqRP7TI8wKdpweN7SjZT21wXsHqRhPyKP4nE4P2abc",
    callbackURL: "http://ctscribble.andrezoon.com/api/twitter/callback"
  },
  GConfig: {
    consumerKey: "325591313256-te9bgr41u58ne2tk2gk0il9a61f5sqsk.apps.googleusercontent.com",
    consumerSecret: "B_L6c9wLcSqMGKCjA74M8o9f",
    callbackURL: "http://wescribble.com/api/google/callback",
    returnURL: "http://ctscribble.andrezoon.com/api/google/callback"
  },
  LConfig: (username, password, done) => {
    console.log("Local Config:", username, password);
    return done(null, {id: 'Holmes'});
  }
}