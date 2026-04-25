/**
 * User Test Fixtures
 * Common test data for user creation and authentication
 */

function buildUniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export const testUsers = {
  get professional1() {
    return {
      email: buildUniqueEmail("pro1"),
      password: "TestPassword123$",
      passwordConfirm: "TestPassword123$",
      firstName: "John",
      lastName: "Developer",
      userType: "professional",
    };
  },
  get professional2() {
    return {
      email: buildUniqueEmail("pro2"),
      password: "TestPassword123$",
      passwordConfirm: "TestPassword123$",
      firstName: "Jane",
      lastName: "Architect",
      userType: "professional",
    };
  },
  get employer() {
    return {
      email: buildUniqueEmail("employer"),
      password: "TestPassword123$",
      passwordConfirm: "TestPassword123$",
      firstName: "Bob",
      lastName: "Recruiter",
      userType: "employer",
      compName: "Acme Corp",
    };
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
