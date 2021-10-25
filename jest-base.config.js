module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'test',
  testRegex: '\\.(test|spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  moduleNameMapper: {
    '^src/(.*)': '<rootDir>/../src/$1',
    '^test/(.*)': '<rootDir>/$1',
    '^src': '<rootDir>/../src',
    '^package\\.json$': '<rootDir>/../package.json',
  },
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageReporters: [
    'json-summary',
  ],
};
