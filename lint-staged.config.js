module.exports = {
  'packages/*/{src,apps,libs,test}/**/*.{js,ts}': [
    'pnpm run -r lint:staged-noargs',
    'pnpm run -r format:staged-noargs',
  ],
};
