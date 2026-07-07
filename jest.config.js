/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: false }],
  },
};