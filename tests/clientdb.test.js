import ClientDB from '../src/index';

const DB = new ClientDB();
const AnotherDB = new ClientDB();

test('DB instance of ClientDB',() => {
  expect(require('../src/index').default).toBeDefined();
  expect(DB).toBeInstanceOf(ClientDB);
});

describe('Collection creation', () => {
  test('Has method "createCollection"',() => {
    expect(DB).toHaveProperty('createCollection');
  });

  test('Should have name',() => {
    function createCollection () {
      DB.createCollection()
    }

    const expectedError = new Error('Name is required for collection. Please set name of collection as argument.');

    expect(createCollection).toThrowError(expectedError);
  });

  test('Collection created',() => {
    DB.createCollection('CREATION TEST');
    expect(DB['CREATION TEST']).toBeDefined();
  });
});

test('Could be created more then one Databases and use separately', () => {
  expect(DB['CREATION TEST']).toBeDefined();
  expect(AnotherDB['CREATION TEST']).toBeUndefined();
});

describe('Delete collection', () => {
  test('Has method "deleteCollection"',() => {
    expect(DB).toHaveProperty('deleteCollection');
  });

  test('Delete collection',() => {
    DB.deleteCollection('CREATION TEST');

    expect(DB['CREATION TEST']).toBeUndefined();
  });
});
