/**
 * Profile Test Fixtures
 * Test data for professional profile CRUD operations
 */

export const createProfileFixtures = {
  valid: {
    hourlyRate: 5000,
    bio: "Experienced Node.js and TypeScript developer with 5 years of experience",
    availabilityStatus: "available",
    responseTimeHours: 24,
  },
  validMinimal: {
    hourlyRate: 3000,
  },
  validAllFields: {
    hourlyRate: 7500,
    bio: "Full-stack developer specializing in MERN stack and cloud architecture",
    availabilityStatus: "available",
    responseTimeHours: 4,
  },
  invalid: {
    negativeRate: {
      hourlyRate: -100,
      bio: "Developer",
    },
    bioTooLong: {
      hourlyRate: 5000,
      bio: "x".repeat(1001),
    },
    invalidAvailability: {
      hourlyRate: 5000,
      availabilityStatus: "invalid_status",
    },
    invalidResponseTime: {
      hourlyRate: 5000,
      responseTimeHours: -5,
    },
    zeroRate: {
      hourlyRate: 0,
      bio: "Developer",
    },
  },
};

export const updateProfileFixtures = {
  valid: {
    bio: "Updated bio - Senior Full-stack Developer",
    hourlyRate: 6000,
    availabilityStatus: "away",
    responseTimeHours: 48,
  },
  partialUpdate: {
    bio: "Only updating bio",
  },
  anotherPartial: {
    hourlyRate: 8000,
    availabilityStatus: "unavailable",
  },
  invalid: {
    negativeRate: {
      hourlyRate: -5000,
    },
    bioTooLong: {
      bio: "x".repeat(2000),
    },
  },
};

export const testProfiles = {
  basic: {
    hourlyRate: 5000,
    bio: "Node.js developer",
    availabilityStatus: "available",
    responseTimeHours: 24,
  },
  senior: {
    hourlyRate: 10000,
    bio: "Senior architect with 15 years of experience",
    availabilityStatus: "available",
    responseTimeHours: 2,
  },
  junior: {
    hourlyRate: 2000,
    bio: "Junior developer looking for opportunities",
    availabilityStatus: "available",
    responseTimeHours: 8,
  },
  unavailable: {
    hourlyRate: 7500,
    bio: "Currently busy with projects",
    availabilityStatus: "unavailable",
    responseTimeHours: 72,
  },
};
