import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('processes.json', 'utf8'));
  console.log(`Loaded ${data.length} records.`);
  
  console.log('Clearing existing process data...');
  await prisma.processHistoryLog.deleteMany({});
  await prisma.processStep.deleteMany({});
  await prisma.processKPI.deleteMany({});
  await prisma.process.deleteMany({});
  await prisma.processLevel.deleteMany({});
  
  const l1Map = new Map();
  const l2Map = new Map();
  
  let processCount = 0;

  for (const row of data) {
    let { l1, l2, l3 } = row;
    if (!l1 || !l3) continue;

    l1 = l1.replace(/\s+/g, ' ').trim();
    l2 = (l2 || '').replace(/\s+/g, ' ').trim();
    l3 = l3.replace(/\s+/g, ' ').trim();

    // Ensure L1 exists
    if (!l1Map.has(l1)) {
      const level1 = await prisma.processLevel.create({
        data: { name: l1, depth: 1, parentId: null }
      });
      l1Map.set(l1, level1);
    }
    const level1 = l1Map.get(l1);

    // Ensure L2 exists
    let level2Id = null;
    if (l2) {
      const l2Key = `${l1}::${l2}`;
      if (!l2Map.has(l2Key)) {
        const level2 = await prisma.processLevel.create({
          data: { name: l2, depth: 2, parentId: level1.id }
        });
        l2Map.set(l2Key, level2);
      }
      level2Id = l2Map.get(l2Key).id;
    }

    let pType = 'MAIN';
    if (l1.startsWith('S')) pType = 'SERVICE';
    if (l1.startsWith('M')) pType = 'MANAGERIAL';

    // Create process (L3 is the process itself)
    // NOTE: For L3 to show up as L3 badge in UI, it's actually handled by the Process element, but let's check ProcessTreeView later.
    await prisma.process.create({
      data: {
        title: l3,
        processType: pType as any,
        levelId: level2Id || level1.id, 
        status: 'APPROVED',
        version: 1,
      }
    });
    processCount++;
  }

  console.log(`Successfully created ${l1Map.size} L1, ${l2Map.size} L2, and ${processCount} Processes.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
