// var firebase = require('firebase/app').default;
// require('firebase/firestore');

const EventEmitter = require('events');

class StoreManager {
  constructor() {
    this._cache = {};
    this._documentClasses = {};
  }

  init(database) {
    this.db = database;
  }

  doc(path) {
    var ref = this.db.doc(path);
    var StoreClass = this.getDocumentStoreClass(ref.parent.id) || DocumentStore; // 対応する Store クラスのドキュメントを作る

    var doc = new StoreClass({
      store: this,
      ref: ref,
    });
    return doc;
  }

  collection(path) {
    var collection = new CollectionStore({
      store: this,
      ref: this.db.collection(path),
    });
    return collection;
  }

  docToStore(doc) {
    var StoreClass = this.getDocumentStoreClass(doc.ref.parent.id) || DocumentStore; // 対応する Store クラスのドキュメントを作る

    var store = new StoreClass({
      store: this,
    });

    store.setDocument(doc);
    return store;
  }

  setCache(key, doc) {
    this._cache[key] = doc;
  }

  getCache(key) {
    return this._cache[key];
  }

  settings(settings) {
    this.db.settings(settings)
  }

  registerDocumentStoreClass(key, value) {
    this._documentClasses[key] = value;
  }

  getDocumentStoreClass(key) {
    return this._documentClasses[key];
  }
}

class CollectionStore extends EventEmitter {
  constructor({store, ref}) {
    super();

    this._store = store;
    this._ref = ref;
    this.items = [];
  }

  async fetch({relation=false}={}) {
    var ss = await this.ref.get();

    var promises = ss.docs.map(async d => {
      var store = this._store.docToStore(d);

      // relation flag が true の場合は relate も実行する
      if (relation) {
        await store.relate();
      }

      return store;
    });

    this.items = await Promise.all(promises);

    return this.items;
  }

  more({relation=false}={}) {
    var store = this;
    if (this.items.length > 0) {
      
    }
  }

  doc(path) {
    return this._store.doc(this.path + '/' + path);
  }

  collection(path) {
    return this._store.collection(this.path + '/' + path);
  }

  where(...args) {
    // TODO:
    this._ref = this.ref.where(...args);
    return this;
  }

  orderBy(...args) {
    // TODO:
    this._ref = this.ref.orderBy(...args);
    return this;
  }

  limit(...args) {
    // TODO:
    this._ref = this.ref.limit(...args);
    return this;
  }

  watch() {
    // TODO:
    if (this.unsubscribe) {
      this.unwatch();
    }
    
    return new Promise(resolve => {
      this.unsubscribe = this.ref.onSnapshot(async (ss) => {
        const prevItems = this.items;
        this.items = ss.docs.map(doc => {
          const item = prevItems.find(prevItem => prevItem.id === doc.id);
          if (item) {
            item.updateDocument(doc);
            return item;
          }
          else {
            return this._store.docToStore(doc);
          }
        });
        this.emit('snapshot', {
          snapshot: ss,
        });
        resolve();
      });
    });
  }

  unwatch() {
    if (this.unsubscribe) {
      this.unsubscribe();
      delete this.unsubscribe;
    }
  }

  async add(data) {
    const ref = await this.ref.add(data);
    return this._store.doc(ref.path);
  }

  get ref() {
    return this._ref;
  }

  get id() {
    return this._ref.id;
  }

  get path() {
    return this._ref.path;
  }

  get parent() {
    return this._store.doc(this._ref.parent.path);
  }
}

class DocumentStore extends EventEmitter {
  constructor({store, ref}) {
    super();

    this._store = store;
    this.reset(ref);
  }

  reset(ref) {
    this.unwatch();

    this._ref = ref;
    this._doc = null;
    this._data = null;
    this._relation = {};
  }

  // TODO:
  setRef() {

  }

  // TODO:
  setDocument(doc) {
    this.reset();
    this.updateDocument(doc)
  }

  updateDocument(doc) {
    this._ref = doc.ref;
    this._doc = doc;
    this._data = doc.data();

    // キャッシュする
    this._store.setCache(this.path, doc);
  }

  // データを取得
  async fetch({cache=true, relation=false}={}) {
    var doc = null;

    if (cache) {
      var cachedDoc = this._store.getCache(this.path);
      if (cachedDoc) {
        if (cachedDoc instanceof Promise) {
          cachedDoc = await cachedDoc;
        }
        doc = cachedDoc;

        this._doc = cachedDoc;
        this._data = doc.data();

        if (relation) {
          await this.relate();
        }
      }
    }

    if (!doc) {
      // ドキュメントを取得して data にセットする promise を作成
      var docPromise = this.ref.get();

      // 一旦 promise をキャッシュする
      this._store.setCache(this.path, docPromise);

      // 待つ
      var doc = await docPromise;
      this._doc = doc;
      this._data = doc.data();

      // 結果をキャッシュにセット
      this._store.setCache(this.path, doc);

      // relation が true の場合は relate 含め待つ
      if (relation) {
        await this.relate();
      }
    }

    return this;
  }

  // cache を無視して必ず更新する
  async refresh({relation=false}={}) {
    return this.fetch({
      cache: false,
      relation,
    });
  }

  // 関連データを取得
  async relate() {
    var relation = {};
    var promises = Object.entries(this.data).map(async ([key, value]) => {
      if (value instanceof firebase.firestore.DocumentReference) {
        var child = await this._store.doc(value.path).fetch();
        relation[key.replace('_ref', '')] = child;
      }
    });
    await Promise.all(promises);
    this._relation = relation;
    return this;
  }

  collection(path) {
    return this._store.collection(this.path + '/' + path);
  }

  watch({ relation=false } = {}) {
    this.unwatch();
    this._unwatch = this.ref.onSnapshot(async (doc) => {
      this.updateDocument(doc);
      if (relation) {
        await this.relate();
      }
      this.emit('snapshot');
    });
  }

  unwatch() {
    if (this._unwatch) {
      this._unwatch();
      this._unwatch = null;
    }
  }

  toData() {
    // TODO
  }

  update(...args) {
    return this.ref.update(...args);
  }

  set(...args) {
    return this.ref.set(...args);
  }

  delete() {
    return this.ref.delete();
  }

  get ref() {
    return this._ref;
  }

  get id() {
    return this._ref.id;
  }

  get path() {
    return this._ref.path;
  }

  get data() {
    return this._data;
  }

  get doc() {
    return this._doc;
  }

  get relation() {
    return this._relation;
  }

  get parent() {
    return this._store.collection(this._ref.parent.path);
  }
}

var store = {
  StoreManager,
  CollectionStore,
  DocumentStore,
};

module.exports = store;
