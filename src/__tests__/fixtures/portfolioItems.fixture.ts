/**
 * Portfolio Items Test Fixtures
 * Test data for portfolio CRUD operations
 */

export const createPortfolioFixtures = {
  valid: {
    title: "E-commerce Platform",
    description: "Full-stack e-commerce solution built with TypeScript, React, and Node.js",
    imageUrl: "https://example.com/ecommerce-thumb.jpg",
    linkUrl: "https://ecommerce-demo.example.com",
  },
  validMinimal: {
    title: "Personal Blog",
  },
  validNoImage: {
    title: "REST API Documentation",
    description: "Comprehensive API documentation using Swagger",
    linkUrl: "https://api-docs.example.com",
  },
  validNoLink: {
    title: "Mobile App Prototype",
    description: "Mobile application prototype built with React Native",
    imageUrl: "https://example.com/mobile-app-proto.jpg",
  },
  validAllFields: {
    title: "Real-time Collaboration Tool",
    description: "A web-based tool for real-time collaboration using WebSockets",
    imageUrl: "https://example.com/collab-tool.jpg",
    linkUrl: "https://collab-tool.example.com",
  },
  invalid: {
    noTitle: {
      description: "A project without title",
      linkUrl: "https://example.com",
    },
    titleTooLong: {
      title: "x".repeat(256),
    },
    descriptionTooLong: {
      title: "Project",
      description: "x".repeat(5001),
    },
    invalidImageUrl: {
      title: "Project",
      imageUrl: "not-a-valid-url",
    },
    invalidLinkUrl: {
      title: "Project",
      linkUrl: "invalid-url",
    },
  },
};

export const updatePortfolioFixtures = {
  valid: {
    title: "Updated Project Title",
    description: "Updated description with more details",
    imageUrl: "https://example.com/new-image.jpg",
    linkUrl: "https://updated-project.example.com",
  },
  partialUpdate: {
    title: "New Title Only",
  },
  updateDescription: {
    description: "Enhanced description with additional features",
  },
  updateLinks: {
    imageUrl: "https://example.com/updated-image.jpg",
    linkUrl: "https://updated-link.example.com",
  },
  invalid: {
    emptyTitle: {
      title: "",
    },
    invalidUrl: {
      imageUrl: "not-an-url",
    },
  },
};

export const testPortfolioItems = {
  webapp: {
    title: "SaaS Dashboard",
    description: "Analytics dashboard for SaaS platform with real-time metrics",
    imageUrl: "https://example.com/saas-dashboard.jpg",
    linkUrl: "https://saas-demo.example.com",
  },
  api: {
    title: "Payment Gateway Integration",
    description: "Integrated Stripe and PayPal into e-commerce platform",
    imageUrl: "https://example.com/payment-integration.jpg",
    linkUrl: "https://github.com/example/payment-gateway",
  },
  library: {
    title: "React UI Component Library",
    description: "Open-source component library with 50+ reusable components",
    imageUrl: "https://example.com/component-library.jpg",
    linkUrl: "https://component-library.example.com",
  },
  mobile: {
    title: "Fitness Tracking App",
    description: "Cross-platform fitness app built with React Native",
    imageUrl: "https://example.com/fitness-app.jpg",
    linkUrl: "https://github.com/example/fitness-app",
  },
};
