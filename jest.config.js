module.exports = {
  moduleNameMapper: {
    '^src(.*)$': '<rootDir>$1',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    'main.ts',
    'cli.ts',
    '.+\\.module\\.ts',
    'config',
    'ports',
    'IoC',
    '__mocks__',
  ],
  moduleDirectories: ['node_modules'],
};
