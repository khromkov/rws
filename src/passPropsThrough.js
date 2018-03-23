export default (src, dst, name) => {
  Object.defineProperty(dst, name, {
    get: () => src[name],
    set: value => {
      src[name] = value; // eslint-disable-line no-param-reassign
    },
    enumerable: true,
    configurable: true,
  });
};
