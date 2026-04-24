/**
 * User Test Fixtures
 * Common test data for user creation and authentication
 */

export const testUsers = {
  professional1: {
    email: "pro1@example.com",
    password: "TestPassword123",
    passwordConfirm: "TestPassword123",
    firstName: "John",
    lastName: "Developer",
    userType: "professional",
  },
  professional2: {
    email: "pro2@example.com",
    password: "TestPassword123",
    passwordConfirm: "TestPassword123",
    firstName: "Jane",
    lastName: "Architect",
    userType: "professional",
  },
  employer: {
    email: "employer@example.com",
    password: "TestPassword123",
    passwordConfirm: "TestPassword123",
    firstName: "Bob",
    lastName: "Recruiter",
    userType: "employer",
    compName: "Acme Corp",
  },
};

export const invalidUsers = {
  missingEmail: {
    password: "TestPassword123",
    firstName: "John",
    userType: "professional",
  },
  weakPassword: {
    email: "test@example.com",
    password: "weak",
    firstName: "John",
    userType: "professional",
  },
  passwordMismatch: {
    email: "test@example.com",
    password: "TestPassword123",
    passwordConfirm: "DifferentPassword123",
    firstName: "John",
    userType: "professional",
  },
  invalidEmail: {
    email: "not-an-email",
    password: "TestPassword123",
    firstName: "John",
    userType: "professional",
  },
};
