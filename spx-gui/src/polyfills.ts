/**
 * @file Runtime polyfills
 */

// Poly fill for `requestIdleCallback`, which is not supported in Safari.
// Copied from https://github.com/pladaria/requestidlecallback-polyfill.
window.requestIdleCallback =
  window.requestIdleCallback ||
  function (cb) {
    const start = Date.now()
    return setTimeout(function () {
      cb({
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50 - (Date.now() - start))
        }
      })
    }, 1)
  }
window.cancelIdleCallback =
  window.cancelIdleCallback ||
  function (id) {
    clearTimeout(id)
  }
