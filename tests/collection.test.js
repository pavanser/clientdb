import Collection from '../src/collection';
import Cluster from '../src/cluster';
import _cloneDeep from 'lodash/cloneDeep';
import { DB, hasProperties, checkMethodListenersWork, testIsCorrect, initListenersConfig } from './utils';

const TEST_ITEM = { id: '4', title: 'Fourth Test 4' };
const SECOND_TEST_ITEM = { id: '5', title: 'Test 5', sub_info: 'Test' };
const FEW_NEW_ITEMS = [{ id: '6', title: 'Test 6' }, { id: '7', title: 'Test 7' }];

const expectedArrayError = new Error('Expected array as an argument');
const expectedObjectError = new Error('Expected plain object as an argument');

DB.createCollection('instance');

test('DB.instance instance of Collection',() => {
  expect(require('../src/collection').default).toBeDefined();
  expect(DB.instance).toBeInstanceOf(Collection);
});

test('Has all collection methods', () => {
  hasProperties(
    DB.instance,
    'name', 'docs', 'schema', 'add', 'bulkAdd', 'getAll', 'getOne', 'getFirst', 'getById',
    'update', 'bulkUpdate', 'upsert','bulkUpsert','delete','subscribe'
  );
});

test('Name is correct', () => {
  expect(DB.instance.name).toBe('instance');
});

test('No docs when just initialized', () => {
  expect(DB.instance.docs).toHaveLength(0);
});

describe('ADD is works', () => {
  const TEST_LISTENER = jest.fn();
  const SECOND_TEST_LISTENER = jest.fn();
  const ONCE_TRIGGERED_LISTENER = jest.fn();
  const ADD_TEST_DATA = { id: '1', title: 'Test' };
  const EXPECTED_DATA_BEFORE_ADD = { all_docs: [], changes: [], action: 'initialized' };
  const EXPECTED_DATA_AFTER_ADD = { all_docs: [ADD_TEST_DATA], changes: [ADD_TEST_DATA], action: 'added' };

  const LISTENERS_CONFIG = initListenersConfig(
    'add',
    ADD_TEST_DATA,
    TEST_LISTENER,
    SECOND_TEST_LISTENER,
    ONCE_TRIGGERED_LISTENER,
    EXPECTED_DATA_BEFORE_ADD,
    EXPECTED_DATA_AFTER_ADD
  );

  test('Should have correct argument', () => {
    testIsCorrect('add', expectedObjectError)
  });

  test('New Item should have id', () => {
    function withoutId() { DB.instance.upsert({}) }

    const shouldHaveIdError = new Error('Doc should have "id"');
    expect(withoutId).toThrowError(shouldHaveIdError);
  });

  test('Should be added', () => {
    const answer = checkMethodListenersWork(LISTENERS_CONFIG);

    hasProperties(answer, 'status', 'added_doc', 'all_docs')

    expect(DB.instance.docs).toHaveLength(1);
    expect(answer.status).toBe('success');
    expect(answer.added_doc).toStrictEqual(ADD_TEST_DATA);
    expect(answer.all_docs).toStrictEqual(DB.instance.docs);
  });

  test('Should prevent duplicates', () => {
    const { length } = DB.instance.docs;

    function addSameData() {
      LISTENERS_CONFIG.data = ADD_TEST_DATA;
      checkMethodListenersWork(LISTENERS_CONFIG, false)
    }

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
  const LISTENERS_CONFIG = initListenersConfig(
    'bulkAdd',
    [],
    BULK_TEST_LISTENER,
    BULK_SECOND_TEST_LISTENER,
    BULK_ONCE_TRIGGERED_LISTENER,
    EXPECTED_DATA_BEFORE_ADD,
    EXPECTED_DATA_AFTER_ADD
  );

  test('Should have correct argument', () => {
    testIsCorrect('bulkAdd', expectedArrayError)
  });

  test('All test data should be added', () => {
    LISTENERS_CONFIG.data = BULK_ADD_TEST_DATA;

    const answer = checkMethodListenersWork(LISTENERS_CONFIG);

    expect(DB.instance.docs).toHaveLength(3);

    expect(answer).toHaveProperty('status');
    expect(answer.status).toBe('success');

    expect(answer).toHaveProperty('added_docs');
    expect(answer.added_docs).toStrictEqual(BULK_ADD_TEST_DATA);

    expect(answer).toHaveProperty('all_docs');
    expect(answer.all_docs).toStrictEqual(DB.instance.docs);
  });

  test('Should prevent duplicates', () => {
    const { length } = DB.instance.docs;

    LISTENERS_CONFIG.data = [ ...BULK_ADD_TEST_DATA, TEST_ITEM ];
    LISTENERS_CONFIG.first_listener.calls_count = 3;
    LISTENERS_CONFIG.first_listener.start_index = 2;
    LISTENERS_CONFIG.data_after = {
      all_docs: [ADD_TEST_DATA, ...BULK_ADD_TEST_DATA, TEST_ITEM],
      changes: [TEST_ITEM],
      action: 'bulk added'
    };

    const answer = checkMethodListenersWork(LISTENERS_CONFIG, false);

    expect(DB.instance.docs.length).toBe(length + 1);

    expect(answer).toHaveProperty('status');
    expect(answer.status).toBe('added with warnings');

    expect(answer).toHaveProperty('added_docs');
    expect(answer.added_docs).toStrictEqual([TEST_ITEM]);

    expect(answer.added_docs).not.toEqual([ ...BULK_ADD_TEST_DATA, TEST_ITEM ].length);

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

describe('UPSERT works', () => {
  const UPSERT_TEST_LISTENER = jest.fn();
  const UPSERT_SECOND_TEST_LISTENER = jest.fn();
  const UPSERT_ONCE_TRIGGERED_LISTENER = jest.fn();

  const EXPECTED_DATA_BEFORE_UPSERT = {
    all_docs: DB.instance.docs,
    changes: DB.instance.docs,
    action: 'initialized'
  };

  const LISTENERS_CONFIG = initListenersConfig(
    'upsert',
    {},
    UPSERT_TEST_LISTENER,
    UPSERT_SECOND_TEST_LISTENER,
    UPSERT_ONCE_TRIGGERED_LISTENER,
    EXPECTED_DATA_BEFORE_UPSERT,
    {}
  );

  test('Should have correct argument', () => {
    testIsCorrect('upsert', expectedObjectError)
  });

  test('Should added new one', function() {
    const docs  = _cloneDeep(DB.instance.docs);
    const testItem = _cloneDeep(SECOND_TEST_ITEM);

    EXPECTED_DATA_BEFORE_UPSERT.all_docs = docs;
    EXPECTED_DATA_BEFORE_UPSERT.changes = docs;

    const EXPECTED_DATA_AFTER_UPSERT = {
      all_docs: [...docs, testItem],
      changes: [testItem],
      action: 'added or updated'
    };

    LISTENERS_CONFIG.data = testItem;
    LISTENERS_CONFIG.first_listener.keys = ['id', 'title', 'sub_info'];
    LISTENERS_CONFIG.first_listener.calls_count = 3;
    LISTENERS_CONFIG.second_listener.keys = ['title'];
    LISTENERS_CONFIG.second_listener.calls_count = 2;
    LISTENERS_CONFIG.data_after = EXPECTED_DATA_AFTER_UPSERT;

    const answer = checkMethodListenersWork(LISTENERS_CONFIG);

    expect(DB.instance.docs.length).toEqual(docs.length + 1);

    expect(answer).toHaveProperty('status');
    expect(answer.status).toBe('success');

    expect(answer).toHaveProperty('upserted');
    expect(answer.upserted).toStrictEqual(testItem);

    expect(answer).toHaveProperty('all_docs');
    expect(answer.all_docs).toStrictEqual(DB.instance.docs);
  });

  test('Should update existed', function() {
    const docs = _cloneDeep(DB.instance.docs);
    const NEW_SUB_INFO = 'Fifth Test';

    const EXPECTED_DATA_AFTER_UPSERT = {
      all_docs: [...docs.slice(0, 4), SECOND_TEST_ITEM],
      changes: [{ id: '5', title: 'Test 5', sub_info: NEW_SUB_INFO }],
      action: 'added or updated'
    };

    expect(_cloneDeep(docs[4].sub_info)).toBe('Test');

    SECOND_TEST_ITEM.sub_info = NEW_SUB_INFO;

    LISTENERS_CONFIG.data = SECOND_TEST_ITEM;
    LISTENERS_CONFIG.data_after = EXPECTED_DATA_AFTER_UPSERT;
    LISTENERS_CONFIG.first_listener.calls_count = 5;
    LISTENERS_CONFIG.first_listener.start_index = 3;
    LISTENERS_CONFIG.second_listener.calls_count = 3;
    LISTENERS_CONFIG.second_listener.start_index = 2;

    const answer = checkMethodListenersWork(LISTENERS_CONFIG, false);

    expect(DB.instance.docs.length).toEqual(docs.length);

    expect(DB.instance.docs[4].sub_info).toBe(NEW_SUB_INFO);

    expect(answer).toHaveProperty('status');
    expect(answer.status).toBe('success');

    expect(answer).toHaveProperty('upserted');
    expect(answer.upserted).toStrictEqual({ id: '5', title: 'Test 5', sub_info: NEW_SUB_INFO });

    expect(answer).toHaveProperty('all_docs');
    expect(answer.all_docs).toStrictEqual(DB.instance.docs);
  });
});

describe('BULK UPSERT works', () => {
  let docs = _cloneDeep(DB.instance.docs);

  const BULK_UPSERT_TEST_LISTENER = jest.fn();
  const BULK_UPSERT_SECOND_TEST_LISTENER = jest.fn();
  const BULK_UPSERT_ONCE_TRIGGERED_LISTENER = jest.fn();

  const LISTENERS_CONFIG = initListenersConfig(
    'bulkUpsert',
    FEW_NEW_ITEMS,
    BULK_UPSERT_TEST_LISTENER,
    BULK_UPSERT_SECOND_TEST_LISTENER,
    BULK_UPSERT_ONCE_TRIGGERED_LISTENER,
    [],
    []
  );

  test('Should have correct argument', () => {
    testIsCorrect('bulkUpsert', expectedArrayError)
  });

  test('Should add new items', function() {
    docs = _cloneDeep(DB.instance.docs);

    const EXPECTED_DATA_BEFORE_BULK_UPSERT = {
      all_docs: docs,
      changes: docs,
      action: 'initialized'
    };

    const EXPECTED_DATA_AFTER_BULK_UPSERT = {
      all_docs: [...docs, ...FEW_NEW_ITEMS],
      changes: FEW_NEW_ITEMS,
      action: 'added or updated'
    };

    LISTENERS_CONFIG.data = FEW_NEW_ITEMS;
    LISTENERS_CONFIG.first_listener.keys = ['id', 'title', 'status'];
    LISTENERS_CONFIG.data_before = EXPECTED_DATA_BEFORE_BULK_UPSERT;
    LISTENERS_CONFIG.data_after = EXPECTED_DATA_AFTER_BULK_UPSERT;

    const answer = checkMethodListenersWork(LISTENERS_CONFIG);

    expect(answer).toHaveProperty('status');
    expect(answer.status).toBe('success');

    expect(answer).toHaveProperty('upserted');
    expect(answer.upserted).toStrictEqual(FEW_NEW_ITEMS);

    expect(answer).toHaveProperty('all_docs');
    expect(answer.all_docs).toStrictEqual(DB.instance.docs);
  });

  test('Should add new items and update existed', function() {
    const UPDATE_DATA = { id: '6', status: 'updated' };

    FEW_NEW_ITEMS[0] = { ...FEW_NEW_ITEMS[0], ...UPDATE_DATA };
    FEW_NEW_ITEMS[2] = { id: '8', title: 'Test 8' };

    const clonedFewItems = _cloneDeep(FEW_NEW_ITEMS);

    LISTENERS_CONFIG.data = clonedFewItems;
    LISTENERS_CONFIG.data_after = {
      all_docs: [...docs, ...clonedFewItems],
      changes: clonedFewItems,
      action: 'added or updated'
    };

    LISTENERS_CONFIG.first_listener.calls_count = 4;
    LISTENERS_CONFIG.first_listener.start_index = 2;
    LISTENERS_CONFIG.second_listener.calls_count = 1;
    LISTENERS_CONFIG.once_listener.calls_count = 1;

    const answer = checkMethodListenersWork(LISTENERS_CONFIG, false)

    expect(DB.instance.docs.length).toBe(docs.length + clonedFewItems.length);

    expect(answer).toHaveProperty('status');
    expect(answer.status).toBe('success');

    expect(answer).toHaveProperty('upserted');
    expect(answer.upserted).toStrictEqual(clonedFewItems);

    expect(answer).toHaveProperty('all_docs');
    expect(answer.all_docs).toStrictEqual(DB.instance.docs);
  });
});

describe('UPDATE works', () => {
  const UPDATE_TEST_LISTENER = jest.fn();
  const UPDATE_SECOND_TEST_LISTENER = jest.fn();
  const UPDATE_ONCE_TRIGGERED_LISTENER = jest.fn();

  const LISTENERS_CONFIG = initListenersConfig(
    'update',
    {},
    UPDATE_TEST_LISTENER,
    UPDATE_SECOND_TEST_LISTENER,
    UPDATE_ONCE_TRIGGERED_LISTENER,
    {},
    {}
  );

  test('Should have correct argument', () => {
    testIsCorrect('update', expectedObjectError)
  });

  test('Should UPDATE existed ONE item', () => {
    const docs = _cloneDeep(DB.instance.docs);
    const FIRST_ITEM = docs[0];

    FIRST_ITEM.title = 'Updated title';

    const EXPECTED_DATA_BEFORE_UPDATE = {
      all_docs: DB.instance.docs,
      changes: DB.instance.docs,
      action: 'initialized'
    };

    const EXPECTED_DATA_AFTER_UPDATE = {
      all_docs: [...docs.slice(1), FIRST_ITEM],
      changes: [FIRST_ITEM],
      action: 'updated'
    };

    LISTENERS_CONFIG.data = FIRST_ITEM;
    LISTENERS_CONFIG.first_listener.start_index = 1;
    LISTENERS_CONFIG.data_after = EXPECTED_DATA_AFTER_UPDATE;
    LISTENERS_CONFIG.data_before = EXPECTED_DATA_BEFORE_UPDATE;

    const answer = checkMethodListenersWork(LISTENERS_CONFIG);
  });

  test('Should NOT UPDATE if not exist', () => {
    function updateNotExisted() {
      LISTENERS_CONFIG.data = { id: '10' };

      checkMethodListenersWork(LISTENERS_CONFIG, false);
    }

    expect(updateNotExisted).toThrowError(new Error('Current object is not in this collection'))
  });

});

describe('BULK UPDATE works', () => {
  let docs = _cloneDeep(DB.instance.docs);

  const BULK_UPDATE_TEST_LISTENER = jest.fn();
  const BULK_UPDATE_SECOND_TEST_LISTENER = jest.fn();
  const BULK_UPDATE_ONCE_TRIGGERED_LISTENER = jest.fn();

  const LISTENERS_CONFIG = initListenersConfig(
    'bulkUpdate',
    FEW_NEW_ITEMS,
    BULK_UPDATE_TEST_LISTENER,
    BULK_UPDATE_SECOND_TEST_LISTENER,
    BULK_UPDATE_ONCE_TRIGGERED_LISTENER,
    [],
    []
  );

  test('Should have correct argument', () => {
    testIsCorrect('bulkUpdate', expectedArrayError)
  });
});

describe('DELETE works', () => {
  const DELETE_TEST_LISTENER = jest.fn();
  const DELETE_SECOND_TEST_LISTENER = jest.fn();
  const DELETE_ONCE_TRIGGERED_LISTENER = jest.fn();
  let initialDocs;

  const LISTENERS_CONFIG = initListenersConfig(
    'delete',
    [],
    DELETE_TEST_LISTENER,
    DELETE_SECOND_TEST_LISTENER,
    DELETE_ONCE_TRIGGERED_LISTENER,
    [],
    [],
    true
  );

  test('Have ids', () => {
    function deleteWithoutIds() {
      DB.instance.delete();
    }

    const msg = 'This method required at least 1 id as argument.';

    expect(deleteWithoutIds).toThrowError(new Error(msg))
  });

  test('Should delete all doc by ID if exist', () => {
    const docs = _cloneDeep(DB.instance.docs);
    const initialLength = docs.length;

    initialDocs = docs;

    const EXPECTED_DATA_BEFORE_DELETE = {
      all_docs: docs,
      changes: docs,
      action: 'initialized'
    };

    const EXPECTED_DATA_AFTER_DELETE = {
      all_docs: docs.slice(1),
      changes: [{ id: '2', title: 'Test 2' }],
      action: 'deleted'
    };

    LISTENERS_CONFIG.data = ['2'];
    LISTENERS_CONFIG.first_listener.calls_count = 2;
    LISTENERS_CONFIG.data_after = EXPECTED_DATA_AFTER_DELETE;
    LISTENERS_CONFIG.data_before = EXPECTED_DATA_BEFORE_DELETE;

    const answer = checkMethodListenersWork(LISTENERS_CONFIG);

    expect(initialLength).toEqual(DB.instance.docs.length + 1);

    const secondAnswer = checkMethodListenersWork(LISTENERS_CONFIG, false);

    expect(initialLength).toEqual(DB.instance.docs.length + 1);

    hasProperties(answer, 'status', 'removed', 'all_docs');
    hasProperties(secondAnswer, 'status', 'removed', 'all_docs');

    expect(answer.status).toBe('success');
    expect(secondAnswer.status).toBe(`Not found doc with id 2`);
    expect(answer.removed).toStrictEqual([{ id: '2', title: 'Test 2' }]);
    expect(secondAnswer.removed.length).toEqual(0);
    expect(answer.all_docs).toStrictEqual(DB.instance.docs);
  });

  test('Should delete all docs by IDs at arguments', () => {
    const docs = _cloneDeep(DB.instance.docs);
    const EXPECTED_DATA_BEFORE_DELETE = {
      all_docs: initialDocs,
      changes: initialDocs,
      action: 'initialized'
    };

    const EXPECTED_DATA_AFTER_DELETE = {
      all_docs: docs.slice(2),
      changes: [{ id: "3", title: "Test 3" }, { id: "4", title: "Fourth Test 4" }],
      action: 'deleted'
    };

    LISTENERS_CONFIG.data = ['3', '4'];
    LISTENERS_CONFIG.first_listener.calls_count = 3;
    LISTENERS_CONFIG.first_listener.start_index = 2;
    LISTENERS_CONFIG.data_after = EXPECTED_DATA_AFTER_DELETE;
    LISTENERS_CONFIG.data_before = EXPECTED_DATA_BEFORE_DELETE;

    const answer = checkMethodListenersWork(LISTENERS_CONFIG, false);

    expect(DB.instance.docs.length).toEqual(5);

    hasProperties(answer, 'status', 'removed', 'all_docs');

    expect(answer.status).toBe('success');
    expect(answer.removed).toStrictEqual([{ id: '3', title: 'Test 3' }, { id: '4', title: 'Fourth Test 4' }]);
    expect(answer.all_docs).toStrictEqual(DB.instance.docs);
  });

  test('Should delete only existed docs and pass no existed', () => {
    const EXPECTED_DATA_BEFORE_DELETE = {
      all_docs: initialDocs,
      changes: initialDocs,
      action: 'initialized'
    };

    const EXPECTED_DATA_AFTER_DELETE = {
      all_docs: [SECOND_TEST_ITEM, ...FEW_NEW_ITEMS],
      changes: [{ id: '1', title: 'Updated title' }],
      action: 'deleted'
    };

    LISTENERS_CONFIG.data = ['1', '2'];
    LISTENERS_CONFIG.first_listener.calls_count = 4;
    LISTENERS_CONFIG.first_listener.start_index = 3;
    LISTENERS_CONFIG.data_after = EXPECTED_DATA_AFTER_DELETE;
    LISTENERS_CONFIG.data_before = EXPECTED_DATA_BEFORE_DELETE;

    const answer = checkMethodListenersWork(LISTENERS_CONFIG, false);

    expect(DB.instance.docs.length).toEqual(4);

    expect(answer).toHaveProperty('status');
    expect(answer.status).toBe('Not found doc with id 2');

    expect(answer).toHaveProperty('removed');
    expect(answer.removed).toStrictEqual([{ id: '1', title: 'Updated title' }]);

    expect(answer).toHaveProperty('all_docs');
    expect(answer.all_docs).toStrictEqual([SECOND_TEST_ITEM, ...FEW_NEW_ITEMS]);
  })
});

describe('SUBSCRIBE works', () => {

  test('Subscribe method is wait for object with required "next" and "keys" properties', () => {
    function funcAsArgs() { DB.instance.subscribe(() => {}) }
    function stringAsArgs() { DB.instance.subscribe('Not '); }
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
  });

  test('Subscriber removed on Unsubscribe call', () => {
    const SUBSCRIBER = jest.fn();

    const unsubscribe = DB.instance.subscribe({
      next: data => SUBSCRIBER(data),
      keys: ['title']
    });

    const listeners = _cloneDeep(DB.instance._listeners);

    unsubscribe();
    DB.instance.delete(DB.instance.docs[0]);

    expect(SUBSCRIBER.mock.calls.length).toBe(1);
    expect(DB.instance._listeners.title.size).toBe(listeners.title.size - 1);
  })
});
