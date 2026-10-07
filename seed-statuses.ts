import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clear any existing processes just to make it clean
  await prisma.process.deleteMany();

  const statuses = [
    'DRAFT', 'PASSPORT_REVIEW_ANALYST', 'PASSPORT_REVIEW_OWNER',
    'STEPS_DRAFT', 'STEPS_REVIEW_ANALYST', 'STEPS_REVIEW_OWNER',
    'KPIS_DRAFT', 'KPIS_REVIEW_ANALYST', 'KPIS_REVIEW_OWNER', 'FINAL_APPROVAL_ANALYST',
    'APPROVED'
  ];

  // Get admin user to be the owner/manager
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  for (let i = 0; i < statuses.length; i++) {
    const s = statuses[i];
    await prisma.process.create({
      data: {
        title: `Тестовий процес (${s})`,
        code: `TEST.${i+1}`,
        status: s as any,
        managerId: admin?.id,
        ownerId: admin?.id
      }
    });
  }

  console.log('Seeded 11 test processes with all statuses!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
