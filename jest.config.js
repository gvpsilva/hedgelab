module.exports = {
  testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
  // Desfaz automaticamente os jest.spyOn() ao fim de cada teste
  restoreMocks: true,
  collectCoverageFrom: ['public/js/**/*.js'],
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  }
};
