import Cluster from '../src/cluster'

const hasProperties = (object, ...props) => {
  props.forEach(propName => {
    expect(object).toHaveProperty(propName);
  })
};

const cluster = new Cluster([{ id: 1, title: 'Test: 3' }, { id: 3, title: 'Test 2' }, { id: 2, title: 'Test 1' }]);

test('Cluster have methods', () => {
  hasProperties(cluster, 'sort', 'limit', 'offset', 'exec');
});

describe('SORT works correct', () => {
  test('Sorted correct', () => {
    const sorted = cluster.sort('id');
    const EXPECTED_SORTED_DATA = [{ id: 1, title: 'Test: 3' }, { id: 2, title: 'Test 1' }, { id: 3, title: 'Test 2' }];

    expect(sorted.data).toStrictEqual(EXPECTED_SORTED_DATA)
  });

  test('Direction works', () => {
    const sorted = cluster.sort('title', 'desc');
    const EXPECTED_SORTED_DATA = [{ id: 1, title: 'Test: 3' }, { id: 3, title: 'Test 2' }, { id: 2, title: 'Test 1' }];

    expect(sorted.data).toStrictEqual(EXPECTED_SORTED_DATA)
  });
});

test('OFFSET works correct', () => {
  const OFFSET = cluster.offset(2);

  expect(OFFSET.data).toStrictEqual([{ id: 2, title: 'Test 1' }])
});

test('PAGE works correct at begin', () => {
  cluster.page(2);

  expect(cluster.current_page).toBe(2)
});

test('PAGE works correct after limit', () => {
  cluster.limit(1).page(0);

  expect(cluster.current_page).toBe(0)
});

test('LIMIT works correct', () => {
  cluster.limit(1);

  expect(cluster.pages.length).toBe(3);
  expect(cluster.data).toStrictEqual([{ id: 1, title: 'Test: 3' }])
});

test('Page data is correct after LIMIT', () => {
  cluster.limit(1).page(1);

  expect(cluster.pages.length).toBe(3);
  expect(cluster.data).toStrictEqual([{ id: 3, title: 'Test 2' }])
});

test('EXEC works correct', () => {
  const data = cluster.exec();

  expect(data).toStrictEqual([{ id: 3, title: 'Test 2' }])
})