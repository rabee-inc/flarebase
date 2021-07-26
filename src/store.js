import firebase from 'firebase/app';
import 'firebase/firestore';

import EventEmitter from 'events';

class BaseStore {
  constructor() {
    this.db = firebase.firestore();
    this._cache = {};
    this._documentClasses = {};
  }

  doc(path) {
    var ref = this.db.doc(path);
    var StoreClass = this.getDocumentClass(ref.parent.id) || BaseDocument; // 対応する Store クラスのドキュメントを作る

    var doc = new StoreClass({
      store: this,
      ref: ref,
    });
    return doc;
  }

  collection() {
    var collection = new BaseCollection({
      store: this,
      ref: this.db.collection(path),
    });
    return collection;
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

  registerDocumentClass(key, value) {
    this._documentClasses[key] = value;
  }

  getDocumentClass(key) {
    return this._documentClasses[key];
  }
}

class BaseCollection extends EventEmitter {
  constructor({store, ref}) {
    super();

    this._store = store;
    this._ref = ref;
  }

  get ref() {
    return this._ref;
  }

  doc(path) {
    var ref = this.ref.doc(path);
    var StoreClass = this._store.getDocumentClass(ref.parent.id) || BaseDocument; // 対応する Store クラスのドキュメントを作る

    var doc = new StoreClass({
      store: this._store,
      ref: this.ref.doc(path),
    });
    return doc;
  }

  collection() {
    var collection = new BaseCollection({
      store: this._store,
      ref: this.ref.collection(path),
    });
    return collection;
  }

  where() {
    // TODO:
  }

  orderBy() {
    // TODO:
  }

  watch() {
    // TODO:
  }

  unwatch() {
    // TODO:
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
}

class BaseDocument extends EventEmitter {
  constructor({store, ref}) {
    super();

    this._store = store;
    this.setup(ref);
  }

  setup(ref) {
    this.unwatch();

    this._ref = ref;
    this._doc = null;
    this._data = null;
    this._relation = {};
  }

  // データを取得
  async fetch({cache=true}={}) {
    var doc = null;

    if (cache) {
      var cachedDoc = this._store.getCache(this.path);
      if (cachedDoc) {
        if (cachedDoc instanceof Promise) {
          cachedDoc = await cachedDoc;
        }
        doc = cachedDoc;
      }
    }

    if (!doc) {
      var docPromise = this.ref.get();

      // 一旦 promise をキャッシュする
      this._store.setCache(this.path, docPromise);
      doc = await docPromise;

      // キャッシュしていた promise を doc に置き換える
      this._store.setCache(this.path, doc);
    }

    this._doc = doc;
    this._data = doc.data();

    return this;
  }

  // 関連データを取得
  async relate() {
    var promises = Object.entries(this.data).map(async ([key, value]) => {
      if (value instanceof firebase.firestore.DocumentReference) {
        var child = await this._store.doc(value.path).fetch();
        this.relation[key.replace('_ref', '')] = child;
      }
    });
  
    await Promise.all(promises);
  
    return this;
  }

  collection(path) {
    var collection = new BaseCollection({
      store: this._store,
      ref: this.ref.collection(path),
    });
    return collection;
  }

  watch() {

  }

  unwatch() {

  }

  toData() {

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
}

var store = {
  BaseStore,
  BaseDocument,
  BaseCollection,
};

export default store;
