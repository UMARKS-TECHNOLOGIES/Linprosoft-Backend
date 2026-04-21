/**
 * Jest Configuration
 * Configures Jest to work with TypeScript and the project structure
 */

module.exports = {
  // Use ts-jest to compile TypeScript files
  preset: 'ts-jest',
  
  // Node is the test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/app.ts',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Timeout for tests (in milliseconds)
  testTimeout: 10000,
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
