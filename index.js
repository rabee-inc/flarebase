var auth = require('./src/auth.js');
var store = require('./src/store.js');

var flarebase = {
  auth,
  store,
};

module.exports = flarebase;