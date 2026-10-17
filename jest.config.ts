// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  silent: true,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1', // 👈 to support "src/..." imports
  },
};

export default config;
