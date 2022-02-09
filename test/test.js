const _ = require('lodash');
const memoize = require('..');

let asyncIdentity;
let memo;
beforeEach(() => {
  asyncIdentity = jest.fn(async (x) => x);
  memo = memoize(asyncIdentity);
});

test('it expects the result function to return a promise', () => {
  const brokenMemo = memoize((x) => x);
  expect(() => brokenMemo('foo')).toThrowError(/promise/);
});

// This is a slightly modified example from `memoize-one`'s README:
// https://github.com/alexreardon/memoize-one#custom-equality-function
test('it supports custom equality functions', async () => {
  const customMemo = memoize(asyncIdentity, _.isEqual);

  memo({ foo: 'bar' });

  // Wait a turn of the event loop for the promise to resolve.
  await Promise.resolve();

  // `undefined` because this argument breaks the cache, since it fails reference equality.
  expect(memo({ foo: 'bar' })).toBeUndefined();

  customMemo({ foo: 'bar' });

  await Promise.resolve();

  const result3 = customMemo({ foo: 'bar' });
  const result4 = customMemo({ foo: 'bar' });

  expect(result4).toBe(result3); // Since the arguments are deep equal.
});

describe('the memo function', () => {
  test('it returns `undefined` the first time it is invoked', () => {
    expect(memo('foo')).toBeUndefined();
  });

  test('it returns the value after the promise resolves', async () => {
    memo('foo');

    // Wait a turn of the event loop for the promise to resolve.
    await Promise.resolve();

    expect(memo('foo')).toBe('foo');
  });

  test('it will only invoke the result function once', async () => {
    memo('foo');
    memo('foo');
    expect(asyncIdentity).toHaveBeenCalledTimes(1);

    // Wait a turn of the event loop for the promise to resolve.
    await Promise.resolve();

    expect(memo('foo')).toBe('foo');

    expect(asyncIdentity).toHaveBeenCalledTimes(1);
  });

  test('it will break the cache if invoked with a different argument', async () => {
    memo('foo');

    // Wait a turn of the event loop for the promise to resolve.
    await Promise.resolve();

    expect(memo('bar')).toBeUndefined();
  });

  // This deviates from `memoize-one`: https://github.com/alexreardon/memoize-one#when-your-result-function-throws
  // It's mainly a consequence of the above.
  test('it will break the cache if a promise rejects', async () => {
    const sometimesThrowingMemo = memoize(async (x) => {
      if (x === 'boo') throw new Error('boo!');
      return x;
    });

    sometimesThrowingMemo('foo');

    // Wait a turn of the event loop for the promise to resolve.
    await Promise.resolve();

    // Cache is populated.
    expect(sometimesThrowingMemo('foo')).toBe('foo');

    // Cache is cleared.
    expect(sometimesThrowingMemo('boo')).toBeUndefined();

    await Promise.resolve();

    // Cache is still cleared.
    expect(sometimesThrowingMemo('boo')).toBeUndefined();
  });

  // This deviates from `memoize-one`: https://github.com/alexreardon/memoize-one#when-your-result-function-throws
  // It's mainly a consequence of the above.
  test('it will not retry an argument that caused a promise to reject', async () => {
    const resultFn = jest.fn(async () => {
      throw new Error('boo!');
    });
    const throwingMemo = memoize(resultFn);

    throwingMemo('boo');

    expect(resultFn).toHaveBeenCalledTimes(1);

    // Wait a turn of the event loop for the promise to resolve.
    await Promise.resolve();

    throwingMemo('boo');

    expect(resultFn).toHaveBeenCalledTimes(1);
  });
});

describe('the `ready` function', () => {
  let ready;
  beforeEach(() => (ready = jest.fn()));

  test('it is not required', async () => {
    expect(() => memo('foo')).not.toThrow();

    // Wait a turn of the event loop for the promise to resolve.
    await Promise.resolve();

    expect(memo('foo')).toBe('foo');
  });

  test('it is called when the promise resolves', async () => {
    memo('foo', ready);

    expect(ready).not.toHaveBeenCalled();

    // Wait a turn of the event loop for the promise to resolve.
    await Promise.resolve();

    expect(ready).toHaveBeenCalled();
  });

  test('the value is available synchronously after `ready` is called', (done) => {
    memo('foo', () => {
      expect(memo('foo')).toBe('foo');
      done();
    });
  });

  test('it is called once per argument', async () => {
    memo('foo', ready);

    // Wait a turn of the event loop for the promise to resolve.
    await Promise.resolve();

    expect(ready).toHaveBeenCalled();

    memo('foo', ready);
    await Promise.resolve();

    expect(ready).toHaveBeenCalledTimes(1);
  });

  test('it is called again for a different argument', async () => {
    memo('foo', ready);

    // Wait a turn of the event loop for the promise to resolve.
    await Promise.resolve();

    expect(ready).toHaveBeenCalled();

    memo('bar', ready);

    await Promise.resolve();

    expect(ready).toHaveBeenCalledTimes(2);
  });

  test('it is called with an error if the promise is rejected', (done) => {
    const throwingMemo = memoize(async () => {
      throw new Error('boo!');
    });

    throwingMemo('foo', (err) => {
      expect(err).toBeDefined();
      done();
    });
  });

  test('it is not called if the cache breaks before the promise resolves', async () => {
    const ready2 = jest.fn();

    memo('foo', ready);
    memo('bar', ready2);

    // Wait a turn of the event loop for the promise to resolve.
    await Promise.resolve();

    expect(ready).not.toHaveBeenCalled();
    expect(ready2).toHaveBeenCalled();
  });
});
