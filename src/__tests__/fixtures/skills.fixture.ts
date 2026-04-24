/**
 * Skill Test Fixtures
 * Test data for skill management operations
 */

export const skillsFixture = {
  validSkills: [
    {
      id: 1,
      name: "TypeScript",
      category: "Programming Languages",
      description: "A typed superset of JavaScript",
    },
    {
      id: 2,
      name: "Node.js",
      category: "Runtime Environments",
      description: "JavaScript runtime built on Chrome's V8 JavaScript engine",
    },
    {
      id: 3,
      name: "React",
      category: "Frontend Frameworks",
      description: "A JavaScript library for building user interfaces",
    },
    {
      id: 4,
      name: "PostgreSQL",
      category: "Databases",
      description: "Advanced open source database",
    },
    {
      id: 5,
      name: "Docker",
      category: "DevOps",
      description: "Containerization platform",
    },
  ],
};

export const addSkillFixtures = {
  valid: {
    skillId: 1,
    proficiencyLevel: "expert",
    yearsOfExperience: 4,
    isPrimary: true,
  },
  validMinimal: {
    skillId: 2,
  },
  validIntermediate: {
    skillId: 3,
    proficiencyLevel: "intermediate",
    yearsOfExperience: 2,
    isPrimary: false,
  },
  validBeginner: {
    skillId: 4,
    proficiencyLevel: "beginner",
    yearsOfExperience: 0,
    isPrimary: false,
  },
  invalid: {
    noSkillId: {
      proficiencyLevel: "expert",
    },
    invalidSkillId: {
      skillId: 99999,
      proficiencyLevel: "expert",
    },
    invalidProficiency: {
      skillId: 1,
      proficiencyLevel: "invalid",
    },
    negativeYears: {
      skillId: 1,
      yearsOfExperience: -5,
    },
    tooManyYears: {
      skillId: 1,
      yearsOfExperience: 150,
    },
  },
};

export const updateSkillFixtures = {
  valid: {
    proficiencyLevel: "expert",
    yearsOfExperience: 5,
    isPrimary: true,
  },
  partialUpdate: {
    proficiencyLevel: "intermediate",
  },
  updateYears: {
    yearsOfExperience: 3,
  },
  updatePrimary: {
    isPrimary: true,
  },
  invalid: {
    invalidProficiency: {
      proficiencyLevel: "master",
    },
    negativeYears: {
      yearsOfExperience: -1,
    },
    emptyUpdate: {},
  },
};

export const getAllSkillsFixture = {
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    validQueries: [
      { limit: 10, offset: 0 },
      { limit: 50, offset: 10 },
      { limit: 100, offset: 0 },
      { offset: 20 }, // Should use default limit
    ],
    invalidQueries: [
      { limit: 0 }, // Too small
      { limit: 150 }, // Too large
      { limit: -10 }, // Negative
      { offset: -5 }, // Negative offset
    ],
  },
};
