const AsyncEventEmitter = require('./async-event-emitter');

class Auth extends AsyncEventEmitter {
  constructor() {
    super();
  }

  async init(firebase) {
    this.firebase = firebase;
    this.auth = firebase.auth();

    // redirect result を取得
    var result = await this.auth.getRedirectResult().catch((e) => {
      var message = this._codeToErrorMessage(e.code);
      e.message = message;
  
      this.emit('fail', e);  
    });

    // user があれば signin を発火
    if (result && result.user) {
      await this.emitAsync('signin', result);
    }
    
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
    var user = await this.authPromise;
    this.emit('ready', user);
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
      return res;
    }
    catch(e) {
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  signInWithRedirect(provider) {
    return this.auth.signInWithRedirect(provider);
  }

  // email と password でサインアップ
  async createUserWithEmailAndPassword(email, password) {
    try {
      var res = await this.auth.createUserWithEmailAndPassword(email, password);
      this.emit('signin', res);
      return res;
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
    var res = await this.auth.signOut();
    this.emit('signout');

    return res;
  }

  get currentUser() {
    return this.auth.currentUser;
  }

  // パスワードリセットメールを送る
  async sendPasswordResetEmail(email, options) {
    try {
      // firebase auth 経由でパスワードリセットリクエスト
      return await this.auth.sendPasswordResetEmail(email, options);
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
      return await this.auth.currentUser.sendEmailVerification(options);
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
      return await this.currentUser.updateEmail(email);
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
      return await this.currentUser.verifyBeforeUpdateEmail(email);
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
      return await this.currentUser.updatePassword(password);
    }
    catch(e) {
      // エラーハンドリング
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  // 許可されているログイン方法を返す
  async fetchSignInMethodsForEmail(email) {
    try {
      return await this.auth.fetchSignInMethodsForEmail(email);
    }
    catch(e) {
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  // ログインリンクメールを送信
  async sendSignInLinkToEmail(email, actionCodeSettings) {
    try {
      return await this.auth.sendSignInLinkToEmail(email, actionCodeSettings);
    }
    catch(e) {
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  // メールリンクでのログイン
  async signInWithEmailLink(email, emailLink) {
    try {
      var res = await this.auth.signInWithEmailLink(email, emailLink);
      this.emit('signin', res);
      return res;
    }
    catch(e) {
      var message = this._codeToErrorMessage(e.code);
      e.message = message;

      this.emit('fail', e);

      throw Error(e);
    }
  }

  // メールリンクと location.href が一致するかの判定
  isSignInWithEmailLink(emailLink) {
    return this.auth.isSignInWithEmailLink(emailLink);
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
      'auth/invalid-action-code': '無効なアクションコードです。',
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
