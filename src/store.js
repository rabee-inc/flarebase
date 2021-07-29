import firebase from 'firebase/app';
import 'firebase/firestore';

import EventEmitter from 'events';

class StoreManager {
  constructor() {
    this.db = firebase.firestore();
    this._cache = {};
    this._documentClasses = {};
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
  }

  async fetch({cache=true}={}) {
    var ss = await this.ref.get();

    this.items = ss.docs.map(d => {
      var StoreClass = this._store.getDocumentClass(d.ref.parent.id) || BaseDocument; // 対応する Store クラスのドキュメントを作る

      var doc = new StoreClass({
        store: this._store,
      });

      doc.setDocument(d);

      return doc;
    });

    return this;
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
    this._ref = doc.ref;
    this._doc = doc;
    this._data = doc.data();

    // キャッシュする
    this._store.setCache(this.path, doc);
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
    return this._store.collection(this.path + '/' + path);
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

  get parent() {
    return this._store.collection(this._ref.parent.path);
  }
}

var store = {
  StoreManager,
  CollectionStore,
  DocumentStore,
};

export default store;
