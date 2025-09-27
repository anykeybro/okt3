module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testTimeout: 30000,
  // Настройки для разных типов тестов
  projects: [
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
      testPathIgnorePatterns: ['<rootDir>/src/__tests__/integration/'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
      modulePathIgnorePatterns: ['<rootDir>/dist/']
    },
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'integration',
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
      modulePathIgnorePatterns: ['<rootDir>/dist/']
    }
  ]
};