// prisma/seed-more.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const statuses = [
  'DRAFT', 
  'PASSPORT_REVIEW_ANALYST', 
  'PASSPORT_REVIEW_OWNER', 
  'STEPS_DRAFT',
  'STEPS_REVIEW_ANALYST',
  'STEPS_REVIEW_OWNER',
  'KPIS_DRAFT',
  'KPIS_REVIEW_ANALYST',
  'KPIS_REVIEW_OWNER',
  'FINAL_APPROVAL_ANALYST',
  'APPROVED',
  'ARCHIVED'
]

const processTypes = ['MAIN', 'MANAGERIAL', 'SERVICE']

async function main() {
  console.log('🌱 Початок генерації додаткових процесів...')

  // Fetch users and levels
  const manager = await prisma.user.findFirst({ where: { role: 'PROCESS_MANAGER' } })
  const owner = await prisma.user.findFirst({ where: { role: 'PROCESS_OWNER' } })
  const analyst = await prisma.user.findFirst({ where: { role: { in: ['PROCESS_ANALYST', 'ADMIN_ANALYST', 'ADMIN'] } } })
  
  if (!manager || !owner || !analyst) {
    throw new Error('Користувачів не знайдено, спочатку запустіть базовий seed')
  }

  const levels = await prisma.processLevel.findMany({ where: { depth: { in: [2, 3] } } })
  
  if (levels.length === 0) {
    throw new Error('Рівнів не знайдено')
  }

  const newProcesses = []

  // Generate 25 more processes to have ~30 total
  for (let i = 1; i <= 25; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const type = processTypes[Math.floor(Math.random() * processTypes.length)]
    const level = levels[Math.floor(Math.random() * levels.length)]
    
    // Some random process names
    const prefixes = ['Управління', 'Оптимізація', 'Забезпечення', 'Аналіз', 'Контроль', 'Розробка']
    const subjects = ['якості', 'ресурсів', 'персоналу', 'інфраструктури', 'продажів', 'клієнтського досвіду', 'ризиків']
    const title = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${subjects[Math.floor(Math.random() * subjects.length)]} ${i}`

    const process = await prisma.process.create({
      data: {
        code: `P-1${i.toString().padStart(2, '0')}`,
        title,
        processType: type,
        objective: `Мета для ${title}`,
        input: 'Вхідні дані',
        output: 'Результат',
        levelId: level.id,
        ownerId: owner.id,
        managerId: manager.id,
        version: 1,
        status: status,
        approvedAt: status === 'APPROVED' ? new Date() : null,
      }
    })

    // Create steps for some processes
    if (status !== 'DRAFT' && status !== 'PASSPORT_REVIEW_ANALYST' && status !== 'PASSPORT_REVIEW_OWNER') {
       await prisma.processStep.create({
         data: {
           processId: process.id,
           orderIndex: 1,
           name: 'Початковий крок',
           description: 'Опис першого кроку',
         }
       })
    }

    // Create workflow records if in review
    if (status.includes('REVIEW') || status.includes('FINAL')) {
      let stage = '';
      let role = '';
      
      if (status.includes('PASSPORT')) {
        stage = status.includes('ANALYST') ? 'PASSPORT_ANALYST_REVIEW' : 'PASSPORT_OWNER_REVIEW'
        role = status.includes('ANALYST') ? 'PROCESS_ANALYST' : 'PROCESS_OWNER'
      } else if (status.includes('STEPS')) {
        stage = status.includes('ANALYST') ? 'STEPS_ANALYST_REVIEW' : 'STEPS_OWNER_REVIEW'
        role = status.includes('ANALYST') ? 'PROCESS_ANALYST' : 'PROCESS_OWNER'
      } else if (status.includes('KPIS')) {
        stage = status.includes('ANALYST') ? 'KPIS_ANALYST_REVIEW' : 'KPIS_OWNER_REVIEW'
        role = status.includes('ANALYST') ? 'PROCESS_ANALYST' : 'PROCESS_OWNER'
      } else if (status === 'FINAL_APPROVAL_ANALYST') {
        stage = 'FINAL_APPROVAL'
        role = 'PROCESS_ANALYST'
      }

      if (stage) {
        await prisma.approvalWorkflow.create({
          data: {
            processId: process.id,
            stage,
            assignedToRole: role,
            isCompleted: false,
          }
        })
      }
    }

    newProcesses.push(process)
  }

  console.log(`✅ Створено ${newProcesses.length} нових процесів!`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
