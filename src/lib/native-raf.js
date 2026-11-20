// CommonJS export compatible with the raf package used by parallax-js.
function raf(callback) {
  return requestAnimationFrame(callback);
}

raf.cancel = (handle) => cancelAnimationFrame(handle);

module.exports = raf;
