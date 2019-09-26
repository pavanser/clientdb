import ClientDB from '../src/index';
import Collection from '../src/collection';
import Cluster from '../src/cluster';
import _intersectionWith from 'lodash/intersectionWith';
import _isEqual from 'lodash/isEqual';
import _cloneDeep from 'lodash/cloneDeep';

const DB = new ClientDB();

describe('Collection', () => {
  DB.createCollection('instance');
  const TEST_ITEM = { id: '4', title: 'Fourth Test 4' };

  test('DB.instance instance of Collection',() => {
    expect(require('../src/collection').default).toBeDefined();
    expect(DB.instance).toBeInstanceOf(Collection);
  });

  test('Has all collection methods', () => {
    expect(DB.instance).toHaveProperty('name');
    expect(DB.instance).toHaveProperty('docs');
    expect(DB.instance).toHaveProperty('schema');
    expect(DB.instance).toHaveProperty('add');
    expect(DB.instance).toHaveProperty('bulkAdd');
    expect(DB.instance).toHaveProperty('getAll');
    expect(DB.instance).toHaveProperty('getOne');
    expect(DB.instance).toHaveProperty('getFirst');
    expect(DB.instance).toHaveProperty('getById');
    expect(DB.instance).toHaveProperty('where');
    expect(DB.instance).toHaveProperty('update');
    expect(DB.instance).toHaveProperty('bulkUpdate');
    expect(DB.instance).toHaveProperty('upsert');
    expect(DB.instance).toHaveProperty('bulkUpsert');
    expect(DB.instance).toHaveProperty('delete');
    expect(DB.instance).toHaveProperty('subscribe');
  });

  test('Name is correct', () => {
    expect(DB.instance.name).toBe('instance');
  });

  test('No docs when just initialized', () => {
    expect(DB.instance.docs).toHaveLength(0);
  });

  describe('SUBSCRIBE configured right', () => {

    test('Subscribe method is wait for object with required "next" and "keys" properties', () => {
      function funcAsArgs() { DB.instance.subscribe(() => {}) }
      function stringAsArgs() { DB.instance.subscribe('asdasdsa'); }
      function arrayAsArgs() { DB.instance.subscribe([]); }
      function withoutNextAndKeys() { DB.instance.subscribe({}); }
      function withoutNext() { DB.instance.subscribe({ keys: [] }); }
      function withoutKeys() { DB.instance.subscribe({ next: () => {} }); }
      function nextIsNotFunc() { DB.instance.subscribe({ next: 'Not func', keys: [] }); }
      function keysIsNotArray() { DB.instance.subscribe({ next: () => {}, keys: 'Not array' }); }

      const msg = 'Subscribe method is wait for object with required "next" and "keys" properties';
      const expectedError = new Error(msg);

      const notFuncMsg = 'Next should be a function';
      const notFuncError = new Error(notFuncMsg);

      const notArrayMsg = 'Keys should be an array';
      const notArrayError = new Error(notArrayMsg);

      expect(funcAsArgs).toThrowError(expectedError);
      expect(stringAsArgs).toThrowError(expectedError);
      expect(arrayAsArgs).toThrowError(expectedError);
      expect(withoutNextAndKeys).toThrowError(expectedError);
      expect(withoutNext).toThrowError(expectedError);
      expect(withoutKeys).toThrowError(expectedError);
      expect(nextIsNotFunc).toThrowError(notFuncError);
      expect(keysIsNotArray).toThrowError(notArrayError);
    })
  });

  describe('ADD is works', () => {
    const TEST_LISTENER = jest.fn();
    const SECOND_TEST_LISTENER = jest.fn();
    const ONCE_TRIGGERED_LISTENER = jest.fn();
    const ADD_TEST_DATA = { id: '1', title: 'Test' };
    const EXPECTED_DATA_BEFORE_ADD = { all_docs: [], changes: [], action: 'initialized' };
    const EXPECTED_DATA_AFTER_ADD = { all_docs: [ADD_TEST_DATA], changes: ADD_TEST_DATA, action: 'added' };

    test('Should be added', () => {
      DB.instance.subscribe({
        next: data => TEST_LISTENER(data),
        keys: ['id', 'title']
      });

      DB.instance.subscribe({
        next: data => SECOND_TEST_LISTENER(data),
        keys: ['id']
      });

      DB.instance.subscribe({
        next: data => ONCE_TRIGGERED_LISTENER(data),
        keys: []
      });

      const answer = DB.instance.add(ADD_TEST_DATA);

      expect(TEST_LISTENER.mock.calls.length).toBe(3);
      expect(TEST_LISTENER.mock.calls[0][0]).toStrictEqual(EXPECTED_DATA_BEFORE_ADD);
      expect(TEST_LISTENER.mock.calls[1][0]).toStrictEqual(EXPECTED_DATA_AFTER_ADD);
      expect(TEST_LISTENER.mock.calls[2][0]).toStrictEqual(EXPECTED_DATA_AFTER_ADD);

      expect(SECOND_TEST_LISTENER.mock.calls.length).toBe(2);
      expect(SECOND_TEST_LISTENER.mock.calls[0][0]).toStrictEqual(EXPECTED_DATA_BEFORE_ADD);
      expect(SECOND_TEST_LISTENER.mock.calls[1][0]).toStrictEqual(EXPECTED_DATA_AFTER_ADD);

      expect(ONCE_TRIGGERED_LISTENER.mock.calls.length).toBe(1);
      expect(ONCE_TRIGGERED_LISTENER.mock.calls[0][0]).toStrictEqual(EXPECTED_DATA_BEFORE_ADD);

      expect(DB.instance.docs).toHaveLength(1);
      expect(answer).toHaveProperty('status');
      expect(answer.status).toBe('success');

      expect(answer).toHaveProperty('added');
      expect(answer.added).toStrictEqual(ADD_TEST_DATA);

      expect(answer).toHaveProperty('all_docs');
      expect(answer.all_docs).toStrictEqual(DB.instance.docs);
    });

    test('Should prevent duplicates', () => {
      const length = DB.instance.docs.length;

      function addSameData() {
        DB.instance.add(ADD_TEST_DATA);
      }

      expect(TEST_LISTENER.mock.calls.length).toBe(3);
      expect(SECOND_TEST_LISTENER.mock.calls.length).toBe(2);
      expect(ONCE_TRIGGERED_LISTENER.mock.calls.length).toBe(1);

      expect(addSameData).toThrowError(new Error('Current object already present in this collection'));
      expect(DB.instance.docs.length).toBe(length);
    })
  });

  describe('BULK ADD is works', () => {
    const BULK_TEST_LISTENER = jest.fn();
    const BULK_SECOND_TEST_LISTENER = jest.fn();
    const BULK_ONCE_TRIGGERED_LISTENER = jest.fn();
    const ADD_TEST_DATA = { id: '1', title: 'Test' };
    const BULK_ADD_TEST_DATA = [{ id: '2', title: 'Test 2' }, { id: '3', title: 'Test 3' }];
    const EXPECTED_DATA_BEFORE_ADD = { all_docs: [ADD_TEST_DATA], changes: [ADD_TEST_DATA], action: 'initialized' };
    const EXPECTED_DATA_AFTER_ADD = { all_docs: [ADD_TEST_DATA, ...BULK_ADD_TEST_DATA], changes: BULK_ADD_TEST_DATA, action: 'bulk added' };

    test('All test data should be added', () => {
      DB.instance.subscribe({
        next: data => BULK_TEST_LISTENER(data),
        keys: ['id', 'title']
      });

      DB.instance.subscribe({
        next: data => BULK_SECOND_TEST_LISTENER(data),
        keys: ['id']
      });

      DB.instance.subscribe({
        next: data => BULK_ONCE_TRIGGERED_LISTENER(data),
        keys: []
      });

      const answer = DB.instance.bulkAdd(BULK_ADD_TEST_DATA);

      expect(BULK_TEST_LISTENER.mock.calls.length).toBe(3);
      expect(BULK_TEST_LISTENER.mock.calls[0][0]).toStrictEqual(EXPECTED_DATA_BEFORE_ADD);
      expect(BULK_TEST_LISTENER.mock.calls[1][0]).toStrictEqual(EXPECTED_DATA_AFTER_ADD);
      expect(BULK_TEST_LISTENER.mock.calls[2][0]).toStrictEqual(EXPECTED_DATA_AFTER_ADD);

      expect(BULK_SECOND_TEST_LISTENER.mock.calls.length).toBe(2);
      expect(BULK_SECOND_TEST_LISTENER.mock.calls[0][0]).toStrictEqual(EXPECTED_DATA_BEFORE_ADD);
      expect(BULK_SECOND_TEST_LISTENER.mock.calls[1][0]).toStrictEqual(EXPECTED_DATA_AFTER_ADD);

      expect(BULK_ONCE_TRIGGERED_LISTENER.mock.calls.length).toBe(1);
      expect(BULK_ONCE_TRIGGERED_LISTENER.mock.calls[0][0]).toStrictEqual(EXPECTED_DATA_BEFORE_ADD);

      expect(DB.instance.docs).toHaveLength(3);

      expect(answer).toHaveProperty('status');
      expect(answer.status).toBe('success');

      expect(answer).toHaveProperty('added');
      expect(answer.added).toStrictEqual(BULK_ADD_TEST_DATA);

      expect(answer).toHaveProperty('all_docs');
      expect(answer.all_docs).toStrictEqual(DB.instance.docs);
    });

    test('Should prevent duplicates', () => {
      const length = DB.instance.docs.length;
      const EXPECTED_DATA_AFTER_ADD = {
        all_docs: [ADD_TEST_DATA, ...BULK_ADD_TEST_DATA, TEST_ITEM],
        changes: [TEST_ITEM],
        action: 'bulk added'
      };

      const answer = DB.instance.bulkAdd([ ...BULK_ADD_TEST_DATA, TEST_ITEM ]);
      const intersected = _intersectionWith(DB.instance.docs, [ ...BULK_ADD_TEST_DATA, TEST_ITEM ], _isEqual);


      expect(BULK_TEST_LISTENER.mock.calls.length).toBe(5);
      expect(BULK_TEST_LISTENER.mock.calls[3][0]).toStrictEqual(EXPECTED_DATA_AFTER_ADD);
      expect(BULK_TEST_LISTENER.mock.calls[4][0]).toStrictEqual(EXPECTED_DATA_AFTER_ADD);

      expect(BULK_SECOND_TEST_LISTENER.mock.calls.length).toBe(3);
      expect(BULK_SECOND_TEST_LISTENER.mock.calls[2][0]).toStrictEqual(EXPECTED_DATA_AFTER_ADD);

      expect(BULK_ONCE_TRIGGERED_LISTENER.mock.calls.length).toBe(1);

      expect(DB.instance.docs.length).toBe(length + 1);

      expect(answer).toHaveProperty('status');
      expect(answer.status).toBe('added with warnings');

      expect(answer).toHaveProperty('added');
      expect(answer.added).toStrictEqual([TEST_ITEM]);

      expect(answer.added).not.toEqual([ ...BULK_ADD_TEST_DATA, TEST_ITEM ].length);

      expect(answer).toHaveProperty('all_docs');
      expect(answer.all_docs).toStrictEqual(DB.instance.docs);
    })

  });

  describe('GET ALL works', () => {
    test('Result instance of Cluster', () => {
      expect(DB.instance.getAll()).toBeInstanceOf(Cluster);
    });

    test('Will return all docs from collection', () => {
      expect(DB.instance.getAll().exec()).toStrictEqual(DB.instance.docs);
    })
  });

  describe('GET ONE works', () => {
    test('Result is NOT instance of Cluster', () => {
      expect(DB.instance.getOne({ id: '4' })).not.toBeInstanceOf(Cluster);
    });

    test('Will return first doc from collection', () => {
      expect(DB.instance.getOne({ id: '4' })).toStrictEqual(TEST_ITEM);
      expect(DB.instance.getOne(doc => doc.title.includes('Four'))).toStrictEqual(TEST_ITEM);
      expect(DB.instance.getOne({ id: '5' })).toEqual(undefined);
    })
  });

  describe('GET FIRST works', () => {
    test('Result is NOT instance of Cluster', () => {
      expect(DB.instance.getFirst()).not.toBeInstanceOf(Cluster);
    });

    test('Will return first doc from collection', () => {
      expect(DB.instance.getFirst()).toStrictEqual(DB.instance.docs[0]);
    })
  });

  describe('GET BY ID works', () => {
    test('Result is NOT instance of Cluster', () => {
      expect(DB.instance.getById('4')).not.toBeInstanceOf(Cluster);
    });

    test('Will return first doc from collection', () => {
      expect(DB.instance.getById('4')).toStrictEqual(TEST_ITEM);
      expect(DB.instance.getById('5')).toEqual(undefined);
    })
  });

  describe('WHERE by id works', () => {
    test('Result is instance of Cluster', () => {
      expect(DB.instance.where({ id: '4' })).toBeInstanceOf(Cluster);
    });

    test('Will return first doc from collection', () => {
      expect(DB.instance.where({id: '4'}).exec()).toStrictEqual(expect.arrayContaining([TEST_ITEM]));
      expect(DB.instance.where(doc => doc.title.includes('Four')).exec()).toStrictEqual(expect.arrayContaining([TEST_ITEM]));
      expect(DB.instance.where({id: '5'}).exec()).toEqual(expect.arrayContaining([]));
    })
  });

  describe('DELETE works', () => {
    const DELETE_TEST_LISTENER = jest.fn();
    const DELETE_SECOND_TEST_LISTENER = jest.fn();
    const DELETE_ONCE_TRIGGERED_LISTENER = jest.fn();
    let initialDocs;

    test('Have ids', () => {
      function deleteWithoutIds() {
        DB.instance.delete();
      }

      const msg = 'This method required at least 1 id as argument.';

      expect(deleteWithoutIds).toThrowError(new Error(msg))
    });

    test('Should delete all doc by ID if exist', () => {
      const docs = _cloneDeep(DB.instance.docs);
      initialDocs = docs;
      const EXPECTED_DATA_BEFORE_DELETE = { all_docs: docs, changes: docs, action: 'initialized' };
      const EXPECTED_DATA_AFTER_DELETE = { all_docs: [docs[0], docs[2], docs[3]], changes: [{ id: '2', title: 'Test 2' }], action: 'deleted' };
      //
      const initialLength = docs.length;

      DB.instance.subscribe({
        next: data => DELETE_TEST_LISTENER(data),
        keys: ['id', 'title']
      });

      DB.instance.subscribe({
        next: data => DELETE_SECOND_TEST_LISTENER(data),
        keys: ['id']
      });

      DB.instance.subscribe({
        next: data => DELETE_ONCE_TRIGGERED_LISTENER(data),
        keys: []
      });

      const answer = DB.instance.delete('2');

      expect(DELETE_TEST_LISTENER.mock.calls.length).toBe(3);
      expect(DELETE_TEST_LISTENER.mock.calls[0][0]).toStrictEqual(EXPECTED_DATA_BEFORE_DELETE);
      expect(DELETE_TEST_LISTENER.mock.calls[1][0]).toStrictEqual(EXPECTED_DATA_AFTER_DELETE);
      expect(DELETE_TEST_LISTENER.mock.calls[2][0]).toStrictEqual(EXPECTED_DATA_AFTER_DELETE);

      expect(DELETE_SECOND_TEST_LISTENER.mock.calls.length).toBe(2);
      expect(DELETE_SECOND_TEST_LISTENER.mock.calls[0][0]).toStrictEqual(EXPECTED_DATA_BEFORE_DELETE);
      expect(DELETE_SECOND_TEST_LISTENER.mock.calls[1][0]).toStrictEqual(EXPECTED_DATA_AFTER_DELETE);

      expect(DELETE_ONCE_TRIGGERED_LISTENER.mock.calls.length).toBe(1);
      expect(DELETE_ONCE_TRIGGERED_LISTENER.mock.calls[0][0]).toStrictEqual(EXPECTED_DATA_BEFORE_DELETE);

      expect(initialLength).toEqual(DB.instance.docs.length + 1);

      const secondAnswer = DB.instance.delete('2');

      expect(DELETE_TEST_LISTENER.mock.calls.length).toBe(3);
      expect(DELETE_SECOND_TEST_LISTENER.mock.calls.length).toBe(2);
      expect(DELETE_ONCE_TRIGGERED_LISTENER.mock.calls.length).toBe(1);

      expect(initialLength).toEqual(DB.instance.docs.length + 1);

      expect(answer).toHaveProperty('status');
      expect(answer.status).toBe('success');

      expect(secondAnswer).toHaveProperty('status');
      expect(secondAnswer.status).toBe(`Not found doc with id 2`);

      expect(answer).toHaveProperty('removed');
      expect(answer.removed).toStrictEqual([{ id: '2', title: 'Test 2' }]);

      expect(secondAnswer).toHaveProperty('removed');
      expect(secondAnswer.removed.length).toEqual(0);

      expect(answer).toHaveProperty('all_docs');
      expect(answer.all_docs).toStrictEqual(DB.instance.docs);
    });

    test('Should delete all docs by IDs at arguments', () => {
      const docs = _cloneDeep(DB.instance.docs);
      const EXPECTED_DATA_BEFORE_DELETE = { all_docs: initialDocs, changes: initialDocs, action: 'initialized' };
      const EXPECTED_DATA_AFTER_DELETE = {
        all_docs: [docs[0]],
        changes: [{ id: "3", title: "Test 3" }, { id: "4", title: "Fourth Test 4" }],
        action: 'deleted'
      };

      const answer = DB.instance.delete('3', '4');

      expect(DELETE_TEST_LISTENER.mock.calls.length).toBe(5);
      expect(DELETE_TEST_LISTENER.mock.calls[3][0]).toStrictEqual(EXPECTED_DATA_AFTER_DELETE);
      expect(DELETE_TEST_LISTENER.mock.calls[4][0]).toStrictEqual(EXPECTED_DATA_AFTER_DELETE);

      expect(DELETE_SECOND_TEST_LISTENER.mock.calls.length).toBe(3);
      expect(DELETE_SECOND_TEST_LISTENER.mock.calls[2][0]).toStrictEqual(EXPECTED_DATA_AFTER_DELETE);

      expect(DELETE_ONCE_TRIGGERED_LISTENER.mock.calls.length).toBe(1);
      expect(DELETE_ONCE_TRIGGERED_LISTENER.mock.calls[0][0]).toStrictEqual(EXPECTED_DATA_BEFORE_DELETE);

      expect(DB.instance.docs.length).toEqual(1);

      expect(answer).toHaveProperty('status');
      expect(answer.status).toBe('success');

      expect(answer).toHaveProperty('removed');
      expect(answer.removed).toStrictEqual([{ id: '3', title: 'Test 3' }, { id: '4', title: 'Fourth Test 4' }]);

      expect(answer).toHaveProperty('all_docs');
      expect(answer.all_docs).toStrictEqual(DB.instance.docs);
    });

    test('Should delete only existed docs and pass no existed', () => {
      const EXPECTED_DATA_BEFORE_DELETE = { all_docs: initialDocs, changes: initialDocs, action: 'initialized' };
      const EXPECTED_DATA_AFTER_DELETE = { all_docs: [], changes: [{ id: '1', title: 'Test' }], action: 'deleted' };

      const answer = DB.instance.delete('1', '2');

      expect(DELETE_TEST_LISTENER.mock.calls.length).toBe(7);
      expect(DELETE_TEST_LISTENER.mock.calls[5][0]).toStrictEqual(EXPECTED_DATA_AFTER_DELETE);
      expect(DELETE_TEST_LISTENER.mock.calls[6][0]).toStrictEqual(EXPECTED_DATA_AFTER_DELETE);

      expect(DELETE_SECOND_TEST_LISTENER.mock.calls.length).toBe(4);
      expect(DELETE_SECOND_TEST_LISTENER.mock.calls[3][0]).toStrictEqual(EXPECTED_DATA_AFTER_DELETE);

      expect(DELETE_ONCE_TRIGGERED_LISTENER.mock.calls.length).toBe(1);
      expect(DELETE_ONCE_TRIGGERED_LISTENER.mock.calls[0][0]).toStrictEqual(EXPECTED_DATA_BEFORE_DELETE);

      expect(DB.instance.docs.length).toEqual(0);

      expect(answer).toHaveProperty('status');
      expect(answer.status).toBe('Not found doc with id 2');

      expect(answer).toHaveProperty('removed');
      expect(answer.removed).toStrictEqual([{ id: '1', title: 'Test' }]);

      expect(answer).toHaveProperty('all_docs');
      expect(answer.all_docs).toStrictEqual([]);
    })
  })
});
