import ClientDB from '../src/index';

const DOCS_WITHOUT_ID = [{ title: 'test 1' }, { title: 'test 2' }];
const shouldHaveIdError = new Error('Doc should have "id"');
const shouldHaveIdErrorBulk = new Error(`All docs should have "id". Please, check next docs: ${JSON.stringify(DOCS_WITHOUT_ID)}`);

export const DB = new ClientDB();

export const initListenersConfig = (method, data, first, second, once, before, after, few_args = false) => ({
  data,
  few_args,
  method,
  first_listener: {
    fn: first,
    keys: ['id', 'title'],
    calls_count: 2,
    start_index: 1
  },
  second_listener: {
    fn: second,
    keys: ['id'],
    calls_count: 1,
    start_index: 1
  },
  once_listener: {
    fn: once,
    keys: [],
    calls_count: 1
  },
  data_before: before,
  data_after: after,
});

export const hasProperties = (object, ...props) => {
  props.forEach(propName => {
    expect(object).toHaveProperty(propName);
  })
};

export const testIsCorrect = (method, mainError) => {
  const isBulkMethod =  method.includes('bulk');
  const idError = isBulkMethod ? shouldHaveIdErrorBulk : shouldHaveIdError;
  const unexpectedValue = isBulkMethod ? {} : [];
  const DOCS = isBulkMethod ? DOCS_WITHOUT_ID : DOCS_WITHOUT_ID[0];

  function ArrayAsAnArgument() { DB.instance[method](unexpectedValue) }
  function StringAsAnArgument() { DB.instance[method]('not object') }
  function FuncAsAnArgument() { DB.instance[method](() => {}) }
  function NullAsAnArgument() { DB.instance[method](null) }
  function UndefiledAsAnArgument() { DB.instance[method](undefined) }
  function NaNAsAnArgument() { DB.instance[method](NaN) }
  function withoutId() { DB.instance[method](DOCS) }

  expect(ArrayAsAnArgument).toThrowError(mainError);
  expect(StringAsAnArgument).toThrowError(mainError);
  expect(FuncAsAnArgument).toThrowError(mainError);
  expect(NullAsAnArgument).toThrowError(mainError);
  expect(UndefiledAsAnArgument).toThrowError(mainError);
  expect(NaNAsAnArgument).toThrowError(mainError);
  expect(withoutId).toThrowError(idError);
};

export const checkMethodListenersWork = (config, initListeners = true) => {
  if (initListeners) {
    DB.instance.subscribe({
      next: data => config.first_listener.fn(data),
      keys: config.first_listener.keys
    });

    DB.instance.subscribe({
      next: data => config.second_listener.fn(data),
      keys: config.second_listener.keys
    });

    DB.instance.subscribe({
      next: data => config.once_listener.fn(data),
      keys: config.once_listener.keys
    });
  }

  let answer;

  if (config.few_args) {
    answer = DB.instance[config.method](...config.data);
  } else  {
    answer = DB.instance[config.method](config.data);
  }

  expect(config.first_listener.fn.mock.calls.length).toBe(config.first_listener.calls_count);
  expect(config.second_listener.fn.mock.calls.length).toBe(config.second_listener.calls_count);
  expect(config.once_listener.fn.mock.calls.length).toBe(config.once_listener.calls_count);

  if (initListeners) {
    expect(config.first_listener.fn.mock.calls[0][0]).toStrictEqual(config.data_before);
    expect(config.second_listener.fn.mock.calls[0][0]).toStrictEqual(config.data_before);
    expect(config.once_listener.fn.mock.calls[0][0]).toStrictEqual(config.data_before);
  }
  config.first_listener.fn.mock.calls.slice(config.first_listener.start_index).forEach(([ args ]) => {
    expect(args).toStrictEqual(config.data_after);
  });

  config.second_listener.fn.mock.calls.slice(config.second_listener.start_index).forEach(([ args ]) => {
    expect(args).toStrictEqual(config.data_after);
  });

  return answer;
};