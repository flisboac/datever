module.exports = {
  '{src,apps,libs,test}/**/*.{js,ts}': [
    'npm run lint:staged-noargs',
    'npm run format:staged-noargs',
  ],
};
