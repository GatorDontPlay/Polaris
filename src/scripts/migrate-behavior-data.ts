#!/usr/bin/env tsx

/**
 * Data Migration Script: Behavior to BehaviorEntry
 * 
 * This script migrates data from the old `behaviors` table to the new `behavior_entries` table.
 * It separates employee and CEO data into separate records as designed.
 * 
 * Usage: npx tsx src/scripts/migrate-behavior-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  totalBehaviors: number;
  employeeEntriesCreated: number;
  ceoEntriesCreated: number;
  errors: string[];
  skipped: number;
}

async function migrateBehaviorData(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalBehaviors: 0,
    employeeEntriesCreated: 0,
    ceoEntriesCreated: 0,
    errors: [],
    skipped: 0,
  };

  console.log('🔄 Starting behavior data migration...');

  try {
    // Get all behaviors from the old table with related data
    const oldBehaviors = await prisma.behavior.findMany({
      include: {
        pdr: {
          include: {
            user: true,
          },
        },
        value: true,
      },
    });

    stats.totalBehaviors = oldBehaviors.length;
    console.log(`📊 Found ${stats.totalBehaviors} behaviors to migrate`);

    if (stats.totalBehaviors === 0) {
      console.log('✅ No behaviors to migrate');
      return stats;
    }

    // Process each behavior
    for (const behavior of oldBehaviors) {
      try {
        console.log(`\n🔄 Processing behavior ${behavior.id} for PDR ${behavior.pdrId}`);

        // Check if this behavior has already been migrated
        const existingEntry = await prisma.behaviorEntry.findFirst({
          where: {
            pdrId: behavior.pdrId,
            valueId: behavior.valueId,
            authorType: 'EMPLOYEE',
          },
        });

        if (existingEntry) {
          console.log(`⏭️  Skipping - already migrated`);
          stats.skipped++;
          continue;
        }

        let employeeEntryId: string | null = null;

        // Create employee entry if there's employee data
        const hasEmployeeData = behavior.description || 
                               behavior.examples || 
                               behavior.employeeSelfAssessment || 
                               behavior.employeeRating;

        if (hasEmployeeData) {
          const employeeEntry = await prisma.behaviorEntry.create({
            data: {
              pdrId: behavior.pdrId,
              valueId: behavior.valueId,
              authorId: behavior.pdr.userId, // Employee is the PDR owner
              authorType: 'EMPLOYEE',
              description: behavior.description,
              examples: behavior.examples,
              selfAssessment: behavior.employeeSelfAssessment,
              rating: behavior.employeeRating,
              comments: null, // Employee comments were stored in selfAssessment
              employeeEntryId: null, // This IS the employee entry
              createdAt: behavior.createdAt,
              updatedAt: behavior.updatedAt,
            },
          });

          employeeEntryId = employeeEntry.id;
          stats.employeeEntriesCreated++;
          console.log(`✅ Created employee entry: ${employeeEntry.id}`);
        }

        // Create CEO entry if there's CEO data
        const hasCeoData = behavior.ceoComments || behavior.ceoRating;

        if (hasCeoData) {
          // We need to find a CEO user to assign as the author
          // For demo purposes, let's find the first CEO user
          const ceoUser = await prisma.user.findFirst({
            where: { role: 'CEO' },
          });

          if (!ceoUser) {
            stats.errors.push(`No CEO user found for behavior ${behavior.id}`);
            console.log(`❌ No CEO user found - skipping CEO entry`);
          } else {
            const ceoEntry = await prisma.behaviorEntry.create({
              data: {
                pdrId: behavior.pdrId,
                valueId: behavior.valueId,
                authorId: ceoUser.id,
                authorType: 'CEO',
                description: behavior.description, // CEO might have modified this
                examples: null,
                selfAssessment: null,
                rating: behavior.ceoRating,
                comments: behavior.ceoComments,
                employeeEntryId: employeeEntryId, // Link to employee entry if exists
                createdAt: behavior.createdAt,
                updatedAt: behavior.updatedAt,
              },
            });

            stats.ceoEntriesCreated++;
            console.log(`✅ Created CEO entry: ${ceoEntry.id}`);
          }
        }

        if (!hasEmployeeData && !hasCeoData) {
          stats.errors.push(`Behavior ${behavior.id} has no data to migrate`);
          console.log(`⚠️  No data to migrate for behavior ${behavior.id}`);
        }

      } catch (error) {
        const errorMsg = `Error processing behavior ${behavior.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        stats.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log('\n🎉 Migration completed!');
    
  } catch (error) {
    const errorMsg = `Fatal migration error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    stats.errors.push(errorMsg);
    console.error(`💥 ${errorMsg}`);
    throw error;
  }

  return stats;
}

async function printMigrationSummary(stats: MigrationStats) {
  console.log('\n📋 Migration Summary:');
  console.log('====================');
  console.log(`📊 Total behaviors processed: ${stats.totalBehaviors}`);
  console.log(`👤 Employee entries created: ${stats.employeeEntriesCreated}`);
  console.log(`👑 CEO entries created: ${stats.ceoEntriesCreated}`);
  console.log(`⏭️  Behaviors skipped (already migrated): ${stats.skipped}`);
  console.log(`❌ Errors encountered: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n🚨 Errors:');
    stats.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  // Verify migration results
  const totalNewEntries = await prisma.behaviorEntry.count();
  console.log(`\n✅ Total BehaviorEntry records in database: ${totalNewEntries}`);

  // Show breakdown by type
  const employeeCount = await prisma.behaviorEntry.count({
    where: { authorType: 'EMPLOYEE' },
  });
  const ceoCount = await prisma.behaviorEntry.count({
    where: { authorType: 'CEO' },
  });

  console.log(`   - Employee entries: ${employeeCount}`);
  console.log(`   - CEO entries: ${ceoCount}`);
}

async function main() {
  try {
    console.log('🚀 Behavior Data Migration Tool');
    console.log('================================\n');

    // Confirm before proceeding
    console.log('⚠️  This will migrate data from the old behaviors table to the new behavior_entries table.');
    console.log('⚠️  Make sure you have a database backup before proceeding.\n');

    // Check if we're in a safe environment
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.DATABASE_URL?.includes('localhost');

    if (!isDevelopment) {
      console.log('🛑 This script should only be run in development environment!');
      console.log('   Set NODE_ENV=development or use a local database.');
      process.exit(1);
    }

    // Run migration
    const stats = await migrateBehaviorData();
    
    // Print summary
    await printMigrationSummary(stats);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Migration completed with errors. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n💡 Next steps:');
      console.log('   1. Test the new BehaviorEntry system');
      console.log('   2. Verify data integrity');
      console.log('   3. Update any remaining code to use BehaviorEntry');
      console.log('   4. Consider removing the old behaviors table after thorough testing');
    }

  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { migrateBehaviorData, MigrationStats };
