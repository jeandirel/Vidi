module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.ts'],
  moduleNameMapper: { '^@vidi/core$': '<rootDir>/packages/core/src/index.ts' },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          target: 'ES2022',
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
  },
};
