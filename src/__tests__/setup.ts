/**
 * Jest Setup Configuration
 * Configures test environment, database connections, and global test utilities
 */

import type { QueryResultRow } from "pg";
import { afterAll, beforeAll, jest } from '@jest/globals';
import pool from "../config/db";

// Increase timeout for database operations
jest.setTimeout(10000);

// Global test variables
export let testDb = pool;

/**
 * Setup test database connection
 */
export async function setupTestDb() {
  try {
    const result = await testDb.query("SELECT NOW()");
    console.log("✅ Test database connected:", result.rows[0]);
    return testDb;
  } catch (error) {
    console.error("❌ Failed to connect to test database:", error);
    throw error;
  }
}

/**
 * Cleanup test data after tests
 */
export async function clearTestData() {
  try {
    // Clear in correct order (foreign keys last)
    await testDb.query("DELETE FROM portfolio_items");
    await testDb.query("DELETE FROM certifications");
    await testDb.query("DELETE FROM professional_skills");
    await testDb.query("DELETE FROM professional_profiles");
    await testDb.query("DELETE FROM users WHERE id > 0");
  } catch (error) {
    console.error("Error clearing test data:", error);
  }
}

/**
 * Cleanup database connection
 */
export async function teardownTestDb() {
  try {
    if (testDb && !testDb.ending) {
      await testDb.end();
    }
  } catch (error) {
    console.error("Error closing test database:", error);
  }
}

/**
 * Helper to run queries in tests
 */
export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, values: any[] = []): Promise<T[]> {
  const result = await testDb.query<T>(sql, values);
  return result.rows;
}

/**
 * Global setup before all tests
 */
beforeAll(async () => {
  await setupTestDb();
});

/**
 * Global cleanup after all tests
 */
afterAll(async () => {
  await clearTestData();
  await teardownTestDb();
});

