/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src/modules/search/__tests__"],
  transform: { "^.+\\.tsx?$": ["ts-jest", { useESM: false, tsconfig: "<rootDir>/tsconfig.jest.json" }] },
  testPathIgnorePatterns: ["\\.integration\\.test\\.ts$"],
};
