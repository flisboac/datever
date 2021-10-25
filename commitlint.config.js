module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 120],
    'body-max-line-length': [2, 'always', 120],
    'footer-max-line-length': [2, 'always', 120],
    'scope-case': [2, 'always', 'lower-case'],
    'scope-max-length': [2, 'always', 60],
    'scope-enum': [2, 'always', [
      '',
      'build',
      'release',
      'docs',
      'lint',
      'lib',
      'cli',
      'cli/docs',
      'lib/parser',
      'lib/domain',
      'lib/util',
      'lib/docs',
    ]],
  },
};
