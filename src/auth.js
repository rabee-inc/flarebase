var firebase = require('firebase/app').default;

require('firebase/auth');


var auth = {
  init() {
    // auth チェック用 promise
    this.authPromise = new Promise(resolve => {
      var completed = firebase.auth().onIdTokenChanged(async (user) => {
        // 監視を停止
        completed();
    
        if (user) {
          resolve(user);
        }
        else {
          resolve(null);
        }
      });
    });
  },

  // auth の状態をする関数
  checkAuth() {
    var currentUser = firebase.auth().currentUser;
    if (currentUser) {
      return Promise.resolve(currentUser);
    }
    else {
      return this.authPromise;
    }
  },
};

module.exports = auth;
