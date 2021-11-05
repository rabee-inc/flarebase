const EventEmitter = require('events');

class Auth extends EventEmitter {
  constructor() {
    super();
  }

  init(firebase) {
    this.firebase = firebase;
    this.auth = firebase.auth();

    // auth チェック用 promise
    this.authPromise = new Promise(resolve => {
      var completed = this.auth.onIdTokenChanged(async (user) => {
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
  }

  // auth の状態をする関数
  checkAuth() {
    var currentUser = this.auth.currentUser;
    if (currentUser) {
      return Promise.resolve(currentUser);
    }
    else {
      return this.authPromise;
    }
  }

  async signIn(email, password) {
    try {
      await this.auth.signInWithEmailAndPassword(email, password);
    }
    catch(e) {
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  async createUserWithEmailAndPassword(email, password) {
    try {
      await this.auth.createUserWithEmailAndPassword(email, password);
    }
    catch(e) {
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

//   async signUp({email, password, invite_id}) {
//     try {
//       await firebase.auth().createUserWithEmailAndPassword(email, password);
//       // ユーザーを作成
//       var user = await app.api.child('me/sign_in').post({invite_id});
//       await this.updateUserData({
//         email: email,
//       });
//     }
//     catch(e) {
//       var message = this._codeToErrorMessage(e.code);
//       spat.modal.alert(message);

//       throw Error(message);
//     }
//   },


  isSignIn() {
    return !!this.auth.currentUser;
  }

  signOut() {
    this.auth.signOut().then(() => {
      riot.update();
    });
  }

  get currentUser() {
    return this.auth.currentUser;
  }


  /*
   * ref: https://firebase.google.com/docs/auth/admin/errors?hl=ja
   */
  _codeToErrorMessage(code) {
    var message = {
      // 共通
      'auth/argument-error': '不正な引数によるエラーです',
      // sign up
      'auth/email-already-in-use': 'すでにこのメールアドレスは別のアカウントで使用されています。別のアカウントで登録してください。',
      'auth/invalid-email': 'メールアドレスが不正です。',
      'auth/operation-not-allowed': 'アカウント登録が有効化されていません',
      'auth/weak-password': 'パスワードのセキュリティが弱すぎます',
      // sign in
      'auth/user-not-found': 'ユーザーが見つかりませんでした。',
      'auth/wrong-password': 'メールアドレスまたはパスワードが間違っています。',
      // sns
      'auth/popup-closed-by-user': 'ログイン処理が中断されました',
      'auth/user-cancelled': 'ログインを拒否しました',
      'auth/provider-already-linked': 'すでにこのアカウントに紐付けられています',
      'auth/credential-already-in-use': 'すでに他のアカウントで使用されています',
      // その他
      'auth/unauthorized-domain': 'ドメインが許可されていません',
      'auth/too-many-requests': '試行回数が多く、一時的にロックされています。時間をおいて再度お試しください。',
      'auth/account-exists-with-different-credential': "すでにこのメールアドレスは別のアカウントで使用されています。別のアカウントで登録してください。",
      'auth/internal-error': '予期しないエラーが発生しました',
      'auth/web-storage-unsupported': 'Cookieがブロックされている可能性があります。ブラウザの設定をご確認ください。',
      'auth/user-disabled': 'このアカウントは退会済みもしくは無効なアカウントです。',
      'auth/requires-recent-login': 'この操作は機密性が高く再度ログインする必要があります。ログアウトして再度ログインしてからお試しください。',
    }[code];

    console.error(code, message);

    return message || code;
  }
}

// var auth = {
//   init() {
//     // auth チェック用 promise
//     this.authPromise = new Promise(resolve => {
//       var completed = firebase.auth().onIdTokenChanged(async (user) => {
//         // 監視を停止
//         completed();
    
//         if (user) {
//           resolve(user);
//         }
//         else {
//           resolve(null);
//         }
//       });
//     });
//   },

//   // auth の状態をする関数
//   checkAuth() {
//     var currentUser = firebase.auth().currentUser;
//     if (currentUser) {
//       return Promise.resolve(currentUser);
//     }
//     else {
//       return this.authPromise;
//     }
//   },
// };

module.exports = {
  Auth,
};
