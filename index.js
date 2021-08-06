var firebase = require('firebase/app').default;
var auth = require('./src/auth.js');
var store = require('./src/store.js');

require('firebase/storage');

var flarebase = {
  firebase,

  init(config) {
    this.firebase = firebase;
    firebase.initializeApp(config);
  },

  auth,
  store,
};

module.exports = flarebase;