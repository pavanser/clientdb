import Cluster from './cluster';

import _intersectionWith from 'lodash/intersectionWith';
import _filter from 'lodash/filter';
import _isEqual from 'lodash/isEqual';
import _find from 'lodash/find';
import _cloneDeep from 'lodash/cloneDeep';
import _isObjectLike from 'lodash/isObjectLike';
import _isArray from 'lodash/isArray';
import _uniq from 'lodash/uniq';
import _remove from 'lodash/remove';
import _differenceBy from 'lodash/differenceBy';

const isArray = docs => {
  if (!_isArray(docs)) {
    throw new Error('Expected array as an argument');
  }
};

const isObject = doc => {
  if (!_isObjectLike(doc) || _isArray(doc)) {
    throw new Error('Expected plain object as an argument');
  }
};

const isWithId = doc => {
  if (!doc.id) {
    throw new Error('Doc should have "id"');
  }
};

const isWithIds = docs => {
  const withoutIds = _filter(docs, doc => !doc.id);

  if (withoutIds.length) {
    const message = `All docs should have "id". Please, check next docs: ${JSON.stringify(withoutIds)}`;

    throw new Error(message);
  }
};


class Collection {
  _listeners;
  #emitListener;
  #triggerListeners;

  constructor(options){
    this.name = options.name;
    this.docs = [];
    this.schema = options.schema;

    this._listeners = {};

    this.#emitListener = (changes, {next, options}, action) => {
      const all_docs = options && options.clustered_all ? new Cluster(this.docs) : this.docs;
      const changes_entity = options && options.clustered_changes ? new Cluster(changes) : changes;

      next({ all_docs, changes: changes_entity, action }, this)
    };

    this.#triggerListeners = (changes, action, keys) => {
      const listenerKeys = keys || Object.keys(this._listeners);

      listenerKeys.forEach(key => {
        if (key === 'id') return;
        if (!this._listeners[key]) return;

        this._listeners[key].forEach((config) => { this.#emitListener(changes, config, action) })
      });
    }
  }

  get cluster() {
    return new Cluster(this.docs);
  }

  add(doc){
    isObject(doc);
    isWithId(doc);

    const intersected = _intersectionWith(this.docs, [doc], _isEqual);

    if (intersected.length) {
      throw new Error('Current object already present in this collection');
    }

    this.docs = [...this.docs, doc];
    this.#triggerListeners([doc], 'added');

    return { all_docs: this.docs, status: "success", added_doc: doc };
  }

  bulkAdd(docs) {
    isArray(docs);
    isWithIds(docs);

    const intersected = _intersectionWith(this.docs, docs, _isEqual);
    const uniq_docs = _differenceBy(docs, intersected, 'id');

    const keys = [];

    uniq_docs.forEach(doc => keys.push(...Object.keys(doc)));

    this.docs = [...this.docs, ...uniq_docs];
    this.#triggerListeners(uniq_docs, 'bulk added', _uniq(keys));

    return {
      all_docs: this.docs,
      added_docs: uniq_docs,
      status: uniq_docs.length !== docs.length ? 'added with warnings' : 'success'
    };
  }

  getAll() {
    return new Cluster(this.docs);
  }

  getOne(options) {
    return _find(this.docs, options)
  }

  getFirst() {
    return this.docs[0]
  }

  getById(id) {
    return _find(this.docs, { id })
  }

  where(filter) {
    const docs = _filter(this.docs, filter);

    return new Cluster(docs);
  }

  update(updated_fields) {
    isObject(updated_fields);
    isWithId(updated_fields);

    const doc = _find(this.docs, doc => doc.id === updated_fields.id);

    if (!doc) {
      throw new Error('Current object is not in this collection');
    }

    const docs =_filter(this.docs, d => d.id !== doc.id);

    const updated_doc = { ...doc, ...updated_fields};

    this.docs = [...docs, updated_doc];
    this.#triggerListeners([updated_doc], 'updated', Object.keys(updated_fields));

    return {
      all_docs: this.docs,
      updated_doc,
      old_doc: doc,
      status: 'success'
    };
  }

  bulkUpdate(docs) {
    isArray(docs);
    isWithIds(docs);

    const itemIds = docs.map(item => item.id);

    const keys = [];
    const docs_for_update = _remove(this.docs, doc => itemIds.includes(doc.id));
    const incomingDocs = _cloneDeep(docs);
    const updated_docs = docs_for_update.map(doc => {
      const update = _remove(incomingDocs, d => d.id === doc.id);

      keys.push(...Object.keys(update[0]));

      return { ...doc, ...update[0]}
    });

    this.docs = [...this.docs, ...updated_docs];
    this.#triggerListeners(updated_docs, 'bulk updated', _uniq(keys));

    if (docs_for_update.length !== itemIds.length) {
      return {
        all_docs: this.docs,
        updated_docs: updated_docs,
        old_docs: docs_for_update,
        passed_data: incomingDocs,
        status: 'Not existed docs were not updated'
      };
    }

    return {
      all_docs: this.docs,
      updated_docs: updated_docs,
      old_docs: docs_for_update,
      status: 'success'
    };
  }

  upsert(doc) {
    isObject(doc);
    isWithId(doc);

    const initialItem = _find(this.docs, d => d.id === doc.id);
    const docs = _filter(this.docs, d => d.id !== doc.id);

    this.docs = [...docs, { ...initialItem, ...doc }];
    this.#triggerListeners([{ ...initialItem, ...doc }], 'added or updated', Object.keys(doc));

    return {
      all_docs: this.docs,
      upserted_doc: { ...initialItem, ...doc },
      status: 'success'
    };
  }

  bulkUpsert(docs) {
    isArray(docs);
    isWithIds(docs);

    const itemIds = docs.map(item => item.id);

    const keys = [];

    docs.forEach(item => { keys.push(...Object.keys(item)); });

    const unchanged_docs = _filter(this.docs,doc => !itemIds.includes(doc.id));

    this.docs = [...unchanged_docs, ...docs];
    this.#triggerListeners(docs, 'added or updated', _uniq(keys));

    return {
      all_docs: this.docs,
      upserted_docs: docs,
      status: 'success'
    };
  }

  delete(...ids) {
    if (!ids.length) {
      throw new Error('This method required at least 1 id as argument.')
    }

    const removed = _remove(this.docs, doc => ids.includes(doc.id));
    const removedIds = removed.map(doc => doc.id);
    const notFoundIds = _filter(ids, id => !removedIds.includes(id)).join(', ');

    removed.length && this.#triggerListeners(removed, 'deleted', Object.keys(removed[0]));

    return {
      status: removed.length === ids.length ? 'success' : `Not found doc with id${notFoundIds.length > 1 ? 's' : ''} ${notFoundIds}`,
      removed,
      all_docs: this.docs
    }
  }

  subscribe( { next, keys, options }) {
    if (!next || !keys) {
      const msg = `Subscribe method is wait for object with required "next" and "keys" properties`;
      throw new Error(msg)
    }

    if (!(next instanceof Function)) {
      const msg = `Next should be a function`;
      throw new Error(msg)
    }

    if (!(keys instanceof Array)) {
      const msg = `Keys should be an array`;
      throw new Error(msg)
    }

    const config = { next, options };

    keys.forEach(key => {
      this._listeners[key] = this._listeners[key] || new Set([]);
      this._listeners[key].add(config);
    });

    this.#emitListener(this.docs, config, 'initialized');

    return () => {
      keys.forEach(key => {
        this._listeners[key].delete(config)
      })
    }
  }
}

export default Collection;
