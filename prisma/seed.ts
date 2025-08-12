import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create company values
  console.log('📋 Creating company values...');
  const values = await Promise.all([
    prisma.companyValue.upsert({
      where: { name: 'Innovation' },
      update: {},
      create: {
        name: 'Innovation',
        description: 'We embrace creativity and continuous improvement to drive forward-thinking solutions.',
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.companyValue.upsert({
      where: { name: 'Integrity' },
      update: {},
      create: {
        name: 'Integrity',
        description: 'We act with honesty, transparency, and ethical standards in all our dealings.',
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.companyValue.upsert({
      where: { name: 'Collaboration' },
      update: {},
      create: {
        name: 'Collaboration',
        description: 'We work together across teams and departments to achieve common goals.',
        sortOrder: 3,
        isActive: true,
      },
    }),
    prisma.companyValue.upsert({
      where: { name: 'Excellence' },
      update: {},
      create: {
        name: 'Excellence',
        description: 'We strive for the highest quality and continuous improvement in everything we do.',
        sortOrder: 4,
        isActive: true,
      },
    }),
    prisma.companyValue.upsert({
      where: { name: 'Customer Focus' },
      update: {},
      create: {
        name: 'Customer Focus',
        description: 'We put our customers at the center of our decisions and deliver exceptional value.',
        sortOrder: 5,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${values.length} company values`);

  // Create active PDR period
  console.log('📅 Creating PDR period...');
  const period = await prisma.pDRPeriod.upsert({
    where: { name: '2024 Annual Review' },
    update: {},
    create: {
      name: '2024 Annual Review',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      isActive: true,
    },
  });

  console.log(`✅ Created PDR period: ${period.name}`);

  // Create CEO user
  console.log('👑 Creating CEO user...');
  const ceoPasswordHash = await bcrypt.hash('password123', 12);
  const ceoUser = await prisma.user.upsert({
    where: { email: 'ceo@company.com' },
    update: {},
    create: {
      email: 'ceo@company.com',
      firstName: 'John',
      lastName: 'CEO',
      role: 'CEO',
      passwordHash: ceoPasswordHash,
      isActive: true,
    },
  });

  console.log(`✅ Created CEO user: ${ceoUser.email}`);

  // Create sample employees
  console.log('👥 Creating sample employees...');
  const employeePassword = await bcrypt.hash('password123', 12);
  
  const employees = await Promise.all([
    prisma.user.upsert({
      where: { email: 'john.smith@company.com' },
      update: {},
      create: {
        email: 'john.smith@company.com',
        firstName: 'John',
        lastName: 'Smith',
        role: 'EMPLOYEE',
        passwordHash: employeePassword,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'sarah.wilson@company.com' },
      update: {},
      create: {
        email: 'sarah.wilson@company.com',
        firstName: 'Sarah',
        lastName: 'Wilson',
        role: 'EMPLOYEE',
        passwordHash: employeePassword,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'mike.johnson@company.com' },
      update: {},
      create: {
        email: 'mike.johnson@company.com',
        firstName: 'Mike',
        lastName: 'Johnson',
        role: 'EMPLOYEE',
        passwordHash: employeePassword,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${employees.length} employees`);

  // Create sample PDRs for employees
  console.log('📊 Creating sample PDRs...');
  for (const employee of employees) {
    const pdr = await prisma.pDR.create({
      data: {
        userId: employee.id,
        periodId: period.id,
        status: 'DRAFT',
        currentStep: 1,
        isLocked: false,
      },
    });

    // Create sample goals for each PDR
    await Promise.all([
      prisma.goal.create({
        data: {
          pdrId: pdr.id,
          title: 'Improve team productivity',
          description: 'Lead initiatives to enhance team efficiency and collaboration',
          targetOutcome: 'Increase team output by 20% while maintaining quality standards',
          successCriteria: 'Measurable increase in completed projects and positive team feedback',
          priority: 'HIGH',
        },
      }),
      prisma.goal.create({
        data: {
          pdrId: pdr.id,
          title: 'Professional development',
          description: 'Expand technical skills and knowledge in relevant areas',
          targetOutcome: 'Complete certification and apply new skills to current projects',
          successCriteria: 'Obtain industry certification and demonstrate applied knowledge',
          priority: 'MEDIUM',
        },
      }),
    ]);

    // Create sample behaviors for each company value
    for (const value of values) {
      await prisma.behavior.create({
        data: {
          pdrId: pdr.id,
          valueId: value.id,
          description: `Demonstrate ${value.name.toLowerCase()} in daily work activities`,
          examples: `Examples of how I embody ${value.name.toLowerCase()} in my role`,
        },
      });
    }

    console.log(`✅ Created PDR with goals and behaviors for ${employee.firstName} ${employee.lastName}`);
  }

  console.log('🎉 Database seed completed successfully!');
  console.log('');
  console.log('📧 Login credentials:');
  console.log('CEO: ceo@company.com / password123');
  console.log('Employee: john.smith@company.com / password123');
  console.log('Employee: sarah.wilson@company.com / password123');
  console.log('Employee: mike.johnson@company.com / password123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
