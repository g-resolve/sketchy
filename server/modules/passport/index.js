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
    callbackURL: "http://nyscribble.andrezoon.com/api/facebook/callback",
    profileFields: ['id', 'displayName', 'photos', 'emails']
  },
  TConfig: {
    consumerKey: "70pf0IArGVNEMaFFdjd5QruRA",
    consumerSecret: "mf4XfEowjqRP7TI8wKdpweN7SjZT21wXsHqRhPyKP4nE4P2abc",
    callbackURL: "http://nyscribble.andrezoon.com/api/twitter/callback",
    userProfileURL  : 'https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true',
    profileFields: ['id', 'displayName', 'photos', 'emails']
  },
  GConfig: {
    clientID: "325591313256-te9bgr41u58ne2tk2gk0il9a61f5sqsk.apps.googleusercontent.com",
    clientSecret: "2s9vr3YTiX_8Sb2U3rAxSObv",
    callbackURL: "http://nyscribble.andrezoon.com/api/google/callback",
    profileFields: ['id', 'displayName', 'photos', 'emails']
  },
  LConfig: (username, password, done) => {
    console.log("Local Config:", username, password);
    return done(null, {id: 'Holmes'});
  }
}