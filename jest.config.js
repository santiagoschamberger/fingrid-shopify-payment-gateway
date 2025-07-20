module.exports = {
  preset: '@remix-run/dev/jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testMatch: [
    '<rootDir>/app/**/__tests__/**/*.(test|spec).{ts,tsx}',
    '<rootDir>/test/**/*.(test|spec).{ts,tsx}'
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/entry.client.tsx',
    '!app/entry.server.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapping: {
    '^~/(.*)$': '<rootDir>/app/$1'
  }
};