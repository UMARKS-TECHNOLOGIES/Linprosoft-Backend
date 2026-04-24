/**
 * Database Schema Verification Script
 * Checks if Phase 2 tables exist and have correct columns
 */

import pool from "../src/config/db";

const PHASE2_SCHEMA = {
  professional_profiles: [
    "id",
    "user_id",
    "hourly_rate",
    "bio",
    "availability_status",
    "response_time_hours",
    "total_hours_worked",
    "avg_rating",
    "total_reviews",
    "created_at",
    "updated_at",
  ],
  skills: [
    "id",
    "name",
    "category",
    "description",
    "created_at",
  ],
  professional_skills: [
    "id",
    "professional_id",
    "skill_id",
    "proficiency_level",
    "years_of_experience",
    "is_primary",
    "created_at",
  ],
  certifications: [
    "id",
    "professional_id",
    "title",
    "issuer",
    "issue_date",
    "expiry_date",
    "credential_url",
    "created_at",
  ],
  portfolio_items: [
    "id",
    "professional_id",
    "title",
    "description",
    "image_url",
    "link_url",
    "created_at",
  ],
};

async function verifySchema() {
  try {
    console.log("\n📊 PHASE 2 DATABASE SCHEMA VERIFICATION\n");
    console.log("=" .repeat(70));

    for (const [tableName, expectedColumns] of Object.entries(PHASE2_SCHEMA)) {
      console.log(`\n📋 Checking table: ${tableName}`);
      console.log("-".repeat(70));

      try {
        // Get all columns for this table
        const result = await pool.query(
          `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
          `,
          [tableName]
        );

        if (result.rows.length === 0) {
          console.log(`❌ TABLE NOT FOUND: ${tableName}`);
          console.log(`   Expected columns: ${expectedColumns.join(", ")}`);
          continue;
        }

        const actualColumns = result.rows.map((row: any) => row.column_name);
        console.log(`✅ TABLE EXISTS`);
        console.log(`   Total columns: ${actualColumns.length}`);

        // Check each expected column
        const missingColumns: string[] = [];
        const presentColumns: string[] = [];

        for (const expectedColumn of expectedColumns) {
          if (actualColumns.includes(expectedColumn)) {
            const colInfo = result.rows.find(
              (r: any) => r.column_name === expectedColumn
            );
            presentColumns.push(expectedColumn);
            console.log(
              `   ✅ ${expectedColumn} (${colInfo.data_type}, nullable: ${colInfo.is_nullable})`
            );
          } else {
            missingColumns.push(expectedColumn);
            console.log(`   ❌ MISSING: ${expectedColumn}`);
          }
        }

        // Check for unexpected columns
        const unexpectedColumns = actualColumns.filter(
          (col: string) => !expectedColumns.includes(col)
        );
        if (unexpectedColumns.length > 0) {
          console.log(`\n   ⚠️  Extra columns (not in schema):`);
          unexpectedColumns.forEach((col: string) => {
            const colInfo = result.rows.find(
              (r: any) => r.column_name === col
            );
            console.log(
              `      • ${col} (${colInfo.data_type})`
            );
          });
        }

        // Summary for this table
        const coverage = (presentColumns.length / expectedColumns.length) * 100;
        console.log(
          `\n   Summary: ${presentColumns.length}/${expectedColumns.length} columns found (${coverage.toFixed(1)}%)`
        );

        if (missingColumns.length > 0) {
          console.log(`   🔧 Migration needed for: ${missingColumns.join(", ")}`);
        }
      } catch (error: any) {
        console.log(`❌ ERROR checking table: ${error.message}`);
      }
    }

    // Check constraints
    console.log("\n" + "=".repeat(70));
    console.log("\n🔐 CHECKING CONSTRAINTS\n");

    // Foreign keys
    console.log("Foreign Keys:");
    const fkResult = await pool.query(
      `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN (${Object.keys(PHASE2_SCHEMA).map((_, i) => `$${i + 1}`).join(",")})
      `,
      Object.keys(PHASE2_SCHEMA)
    );

    if (fkResult.rows.length > 0) {
      fkResult.rows.forEach((fk: any) => {
        console.log(
          `  ✅ ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`
        );
      });
    } else {
      console.log("  ⚠️  No foreign keys found");
    }

    // Unique constraints
    console.log("\nUnique Constraints:");
    const ucResult = await pool.query(
      `
      SELECT
        tc.constraint_name,
        tc.table_name,
        string_agg(kcu.column_name, ', ') as columns
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_name IN (${Object.keys(PHASE2_SCHEMA).map((_, i) => `$${i + 1}`).join(",")})
      GROUP BY tc.constraint_name, tc.table_name
      `,
      Object.keys(PHASE2_SCHEMA)
    );

    if (ucResult.rows.length > 0) {
      ucResult.rows.forEach((uc: any) => {
        console.log(
          `  ✅ ${uc.table_name}: UNIQUE(${uc.columns})`
        );
      });
    } else {
      console.log("  ⚠️  No unique constraints found");
    }

    // Indexes
    console.log("\nIndexes:");
    const idxResult = await pool.query(
      `
      SELECT
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE tablename IN (${Object.keys(PHASE2_SCHEMA).map((_, i) => `$${i + 1}`).join(",")})
        AND indexname NOT LIKE 'pg_toast%'
      ORDER BY tablename, indexname
      `,
      Object.keys(PHASE2_SCHEMA)
    );

    if (idxResult.rows.length > 0) {
      const indexesByTable: { [key: string]: string[] } = {};
      idxResult.rows.forEach((idx: any) => {
        if (!indexesByTable[idx.tablename]) {
          indexesByTable[idx.tablename] = [];
        }
        indexesByTable[idx.tablename].push(idx.indexname);
      });

      Object.entries(indexesByTable).forEach(([table, indexes]) => {
        console.log(`  ${table}:`);
        indexes.forEach((idx) => {
          const isPrimary = idx.includes("pkey");
          const emoji = isPrimary ? "🔑" : "📇";
          console.log(`    ${emoji} ${idx}`);
        });
      });
    }

    console.log("\n" + "=".repeat(70));
    console.log("\n✅ VERIFICATION COMPLETE\n");

    // Generate summary
    const allTablesExist = Object.keys(PHASE2_SCHEMA).every((tableName) => {
      const exists = fkResult.rows.some((fk: any) => fk.table_name === tableName) ||
                     ucResult.rows.some((uc: any) => uc.table_name === tableName) ||
                     idxResult.rows.some((idx: any) => idx.tablename === tableName);
      return exists;
    });

    console.log("SUMMARY:");
    console.log(`  Tables: ${allTablesExist ? "✅ All found" : "❌ Some missing"}`);
    console.log(`  Foreign Keys: ${fkResult.rows.length > 0 ? "✅ Found" : "❌ None found"}`);
    console.log(`  Unique Constraints: ${ucResult.rows.length > 0 ? "✅ Found" : "⚠️  Consider adding"}`);
    console.log(`  Indexes: ${idxResult.rows.length > 0 ? "✅ Found" : "⚠️  Consider adding"}`);

  } catch (error: any) {
    console.error("❌ ERROR during verification:", error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verifySchema();
