const modifier = (...args) => ({args});

module.exports = new Proxy(
  {},
  {
    get: () => modifier,
  },
);
