import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('processes.json', 'utf8'));
  
  const uniqueL1s = new Set<string>();

  for (const row of data) {
    let { l1 } = row;
    if (!l1) continue;
    l1 = l1.replace(/\s+/g, ' ').trim();
    uniqueL1s.add(l1);
  }

  console.log(`Found ${uniqueL1s.size} unique L1 levels.`);

  for (const l1 of uniqueL1s) {
    const exists = await prisma.processLevel.findFirst({ where: { name: l1, depth: 1 } });
    if (!exists) {
      await prisma.processLevel.create({
        data: { name: l1, depth: 1, parentId: null }
      });
      console.log(`Created L1: ${l1}`);
    }
  }

  console.log('L1 base structure seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
