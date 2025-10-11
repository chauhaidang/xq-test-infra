module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setup/test-setup.js'],
  testTimeout: 30000,
  verbose: true,
  collectCoverage: false,
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  bail: 1,
  forceExit: true,
  clearMocks: true,
  // Output JSON results for CI/CD processing
  reporters: [['github-actions', { silent: false }], 'summary'],
}