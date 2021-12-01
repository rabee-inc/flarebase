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

    // ログイン状態がわかるようになったタイミングで 1回だけ trigger する
    this.authPromise.then((user) => {
      this.emit('ready', user);
    });

    // redirect result 時のイベントを登録しておく
    this.auth.getRedirectResult().then(this._callbackRedirectResult.bind(this)).catch(this._callbackRedirectResultFail.bind(this));
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

  // email と password でサインイン
  async signInWithEmailAndPassword(email, password) {
    try {
      var res = await this.auth.signInWithEmailAndPassword(email, password);
      this.emit('signin', res);
    }
    catch(e) {
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  // credential でサインイン
  async signInWithCredential(credential) {
    try {
      var res = await this.auth.signInWithCredential(credential);
      this.emit('signin', res);
    }
    catch(e) {
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  signInWithRedirect(provider) {
    this.auth.signInWithRedirect(provider);
  }

  // email と password でサインアップ
  async createUserWithEmailAndPassword(email, password) {
    try {
      var res = await this.auth.createUserWithEmailAndPassword(email, password);
      this.emit('signup', res);
      this.emit('signin', res);
    }
    catch(e) {
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  isSignIn() {
    return this.auth && !!this.auth.currentUser;
  }

  async signOut() {
    await this.auth.signOut();
    this.emit('signout');
  }

  get currentUser() {
    return this.auth.currentUser;
  }

  // パスワードリセットメールを送る
  async sendPasswordResetEmail(email, options) {
    try {
      // firebase auth 経由でパスワードリセットリクエスト
      await this.auth.sendPasswordResetEmail(email, options);
    }
    catch(e) {
      // エラーハンドリング
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  // メール認証
  async sendEmailVerification(options) {
    try {
      // firebase auth 経由でパスワードリセットリクエスト
      await this.auth.currentUser.sendEmailVerification(options);
    }
    catch(e) {
      // エラーハンドリング
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  // email を更新
  async updateEmail(email, options) {
    try {
      // firebase auth 経由で email を更新
      await this.currentUser.updateEmail(email);
    }
    catch(e) {
      // エラーハンドリング
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  // email を認証有りで更新
  async verifyBeforeUpdateEmail(email, options) {
    try {
      await this.currentUser.verifyBeforeUpdateEmail(email);
    }
    catch(e) {
      // エラーハンドリング
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  // パスワードを更新
  async updatePassword(password) {
    try {
      await this.currentUser.updatePassword(password);
    }
    catch(e) {
      // エラーハンドリング
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  // リダイレクトログイン成功時の処理
  _callbackRedirectResult(result) {
    this.emit('result', result);

    if (result.user) {
      this.emit('signin');
    }
  }

  // リダイレクトログイン失敗時の処理
  _callbackRedirectResultFail(e) {
    var message = this._codeToErrorMessage(e.code);
    e.message = message;

    this.emit('fail', e);
  }

  /*
   * code をエラーメッセージに変換
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
      'auth/configuration-not-found': '構成が見つかりませんでした。',
    }[code];

    console.error(code, message);

    return message || code;
  }
};

module.exports = {
  Auth,
};
