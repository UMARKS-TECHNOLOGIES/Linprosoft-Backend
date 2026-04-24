/**
 * Certification Test Fixtures
 * Test data for certification CRUD operations
 */

export const createCertificationFixtures = {
  valid: {
    title: "AWS Certified Solutions Architect",
    issuer: "Amazon Web Services",
    issueDate: "2024-01-15",
    expiryDate: "2026-01-15",
    credentialUrl: "https://aws.amazon.com/certification/certified-solutions-architect",
  },
  validMinimal: {
    title: "Google Cloud Associate Cloud Engineer",
  },
  validNoExpiry: {
    title: "Linux Foundation Certified Associate",
    issuer: "Linux Foundation",
    issueDate: "2023-06-10",
    credentialUrl: "https://linuxfoundation.org",
  },
  validExpired: {
    title: "Expired Certification",
    issuer: "Some Org",
    issueDate: "2020-01-01",
    expiryDate: "2022-01-01",
  },
  invalid: {
    noTitle: {
      issuer: "Amazon",
      issueDate: "2024-01-15",
    },
    invalidDateFormat: {
      title: "Some Cert",
      issueDate: "not-a-date",
    },
    expiryBeforeIssue: {
      title: "Invalid Cert",
      issueDate: "2025-01-01",
      expiryDate: "2024-01-01",
    },
    futureDateIssue: {
      title: "Future Cert",
      issueDate: "2099-01-01",
    },
    invalidUrl: {
      title: "Cert",
      credentialUrl: "not-a-valid-url",
    },
  },
};

export const updateCertificationFixtures = {
  valid: {
    title: "Updated Certification Title",
    issuer: "New Issuer",
    issueDate: "2023-01-01",
    expiryDate: "2025-01-01",
    credentialUrl: "https://example.com/new",
  },
  partialUpdate: {
    title: "Renamed Certification",
  },
  updateExpiry: {
    expiryDate: "2027-12-31",
  },
  updateCredential: {
    credentialUrl: "https://example.com/updated-credential",
  },
  invalid: {
    emptyString: {
      title: "",
    },
    invalidDateFormat: {
      issueDate: "01-01-2024",
    },
  },
};

export const testCertifications = {
  aws: {
    title: "AWS Certified Solutions Architect - Professional",
    issuer: "Amazon Web Services",
    issueDate: "2023-06-15",
    expiryDate: "2025-06-15",
    credentialUrl: "https://aws.amazon.com/certification",
  },
  kubernetes: {
    title: "Certified Kubernetes Administrator",
    issuer: "Cloud Native Computing Foundation",
    issueDate: "2023-03-10",
    expiryDate: "2026-03-10",
    credentialUrl: "https://cncf.io/certification/cka",
  },
  docker: {
    title: "Docker Certified Associate",
    issuer: "Docker",
    issueDate: "2022-12-01",
    expiryDate: "2025-12-01",
    credentialUrl: "https://www.docker.com/certification",
  },
};
