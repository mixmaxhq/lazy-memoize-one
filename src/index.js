const memoize = require('memoize-one');

/**
 * Creates a memoized version of the specified asynchronous function, that returns synchronously,
 * while resolving values asynchronously.
 *
 * @param {AsyncFunction} resultFn - An asynchronous function.
 * @param {(Function<any, any> => Boolean) = (a, b) => a === b} isEqual - A function for checking
 *   the equality of arguments to `resultFn`. Defaults to reference equality i.e. `===`.
 *
 * @return {Function} A memoized version of `resultFn`, with one additional argument.
 *   @param {...Array<any>} args - The regular arguments to `resultFn`.
 *   @param {Function<Error> = () => {}} ready - A function to be called by the memoized function once it has
 *     resolved the promise returned by `resultFn`. After this point, if the memoized function is
 *     called again with the same arguments (as determined by `isEqual`), it will return the value
 *     to which the promise resolved.
 *
 *     If the promise is rejected, `ready` will be called with the error with which it was rejected.
 *
 *     `ready` will not be called if the memoized function is called with different arguments before
 *     the promise settles.
 *
 *     This argument is optional, unless the final member of `args` is a function, in which you must
 *     pass `ready` to distinguish the two.
 *
 *   @return {any} `undefined` if the memoized function has not yet resolved the promise returned by
 *     `resultFn`, or the promise was rejected; otherwise, the value to which the promise resolved.
 */
module.exports = function(resultFn, isEqual) {
  const memo = memoize(resultFn, isEqual);

  let lastResult;
  let lastPromise;
  let lastReady;

  return function(...args) {
    let ready = args[args.length - 1];
    if (typeof ready === 'function') {
      args.pop();
    } else {
      ready = () => {};
    }

    // Only invoke the ready function if we still have the result memoized by the time that we
    // determine the result.
    function ifStillLastReady(...args) {
      if (ready === lastReady) ready.apply(this, args);
    }

    const promise = memo.apply(this, args);
    if (!(promise instanceof Promise)) throw new Error('`resultFn` must return a promise');

    if (promise !== lastPromise) {
      lastResult = undefined;
      lastPromise = promise;
      lastReady = ready;

      promise
        .then((result) => {
          lastResult = result;
          ifStillLastReady();
        })
        .catch(ifStillLastReady);
    }

    return lastResult;
  };
};
