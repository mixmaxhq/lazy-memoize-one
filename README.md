# lazy-memoize-one

A wrapper around [`memoize-one`] for use with asynchronous functions, that resolves their values
asynchronously while returning synchronously.

## Rationale

`memoize-one` is a great library until you consider how to use it with asynchronous results:

```js
import memoizeOne from 'memoize-one';

const add = async (a, b) => a + b;
const memoizedAdd = memoizeOne(add);

memoizedAdd(1, 2); // Promise
```

The memoization still _works_&mdash;if you call `memoizedAdd(1, 2)` again it will return the same
`Promise`, without executing `add` another time&mdash;but it's not very usable anymore: every
call to `memoizedAdd` will have to `await` the result of the promise.

In some cases, it's easier to deal with the result synchronously, if and when it's available; and
if it's not, retry later. For example, `memoize-one` is often used [in React components], where
as of React 16.4 `render` executes synchronously, but components can rerun `render` at any time
by calling `setState`.

In these cases, you have `lazy-memoize-one`:

```js
import memoizeOne from 'lazy-memoize-one';

const add = async (a, b) => a + b;
const memoizedAdd = memoizeOne(add);

memoizedAdd(1, 2); // `undefined`

// Wait a turn of the event loop, for `add`'s return value to resolve…
await Promise.resolve();

memoizedAdd(1, 2); // 3
```

You can even pass a function as the last argument to the memoized function, to let you know when
the result is ready:

```js
memoizedAdd(2, 3, (err) => {
  if (err) {
    console.error('Failed to add 2 + 3 for some reason:', err);
  } else {
    console.log(`2 + 3 is ${memoizedAdd(2, 3)}`);
  }
});
```

## Installation

```sh
npm install lazy-memoize-one
```

## Usage

First, create a memoized function just like `memoize-one`, by passing a function and (optionally)
a [custom equality function]:

```js
import memoizeOne from 'lazy-memoize-one'; // or `const memoizeOne = require('lazy-memoize-one');`

const add = async (a, b) => a + b;
const memoizedAdd = memoizeOne(add);
```

Note that, in contrast to `memoize-one`, the original function being memoized **must** be an `async`
function. (If it's not, why are you using this library? You'll get synchronous results by using
regular `memoize-one`.)

Now call the memoized function with the same arguments as you would call the original function.
You won't get a `Promise` back, though. Instead, the memoized function will resolve the promise
behind the scenes while returning `undefined`, then return the value with which the promise
resolves:

```js
memoizedAdd(1, 2); // `undefined`

// Wait a turn of the event loop, for `add`'s return value to resolve…
await Promise.resolve();

memoizedAdd(1, 2); // 3
```

If the promise is rejected, `memoizedAdd` will continue to return `undefined`.

If you want to know when the promise settles, you can pass a function as the last argument to the
memoized function. This function will be called when the promise is resolved or rejected:

```js
memoizedAdd(2, 3, (err) => {
  if (err) {
    console.error('The promise was rejected with error:', err);
  } else {
    console.log(`2 + 3 is ${memoizedAdd(2, 3)}`);
  }
});
```

This function will _not_ be called if the memoized function was called with different arguments
before the promise was settled, however, primarily because you wouldn't be able to retrieve the
promise's result at that point anyway (it will no longer be in the cache).

## Differences from other libraries

### `memoize-one`

Read the [rationale] for the biggest difference from [`memoize-one`]: the ability to memoize
asynchronous functions but work with their results synchronously.

Other differences:

* the original function being memoized **must** be an `async` function. (If it's not, why are you
  using this library? You'll get synchronous results by using regular `memoize-one`.)<br><br>
* there _is_ caching [when your result function throws]. Specifically, the previously-cached value
  (if any) will be discarded, and the memoized function will return `undefined`. Furthermore, the
  memoized function will not execute the original function a second time if the memoized function
  is next called with the same arguments.

  This is primarily a consequence of using `memoize-one` (which this library does, internally) to
  cache promises, since this means updating the cache before it's known whether doing so will fail.
  For what it's worth, you would have the same difficulty if you were to use `memoize-one` directly
  with async functions.

### `lazy-memoize`

[`lazy-memoize`] differs from this library in two big ways. The first is that it caches all the
calls you make of it, not just the latest one.

The second is that it forces you to `await` the cache being initialized. The "lazy" part of this
library is that it returns `undefined` while it's loading, synchronously; then returns the value,
also synchronously. The "lazy" part of `lazy-memoize` is that it expires the initial values
eventually and then fetches _updated_ values asynchronously, while returning the previous value
more quickly.

This is unacceptable for this library's use case, where access always has to be synchronous, and it
is ok for the cache to temporarily return `undefined`.

## Contributing / Roadmap

We welcome bug reports and feature suggestions. PRs are even better!

[`memoize-one`]: https://github.com/alexreardon/memoize-one
[in React components]: https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html#what-about-memoization
[custom equality function]: https://github.com/alexreardon/memoize-one#custom-equality-function
[rationale]: #rationale
[when your result function throws]: https://github.com/alexreardon/memoize-one#when-your-result-function-throws
[`lazy-memoize`]: https://github.com/akdor1154/node-lazy-memoize#readme
