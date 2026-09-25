// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Запуск seed...')

  console.log('🗑️ Очищення бази даних...')
  await prisma.processHistoryLog.deleteMany()
  await prisma.approvalWorkflow.deleteMany()
  await prisma.processKPI.deleteMany()
  await prisma.processStep.deleteMany()
  await prisma.process.deleteMany()
  await prisma.processLevel.deleteMany()
  
  // ── Користувачі (mock auth) ──
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: { role: "ADMIN", fullName: 'Системний Адміністратор' },
    create: {
      email: 'admin@company.com',
      password: 'password123',
      fullName: 'Системний Адміністратор',
      role: "ADMIN",
    },
  })

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@company.com' },
    update: { role: "PROCESS_ANALYST", fullName: 'Іваненко Олена' },
    create: {
      email: 'analyst@company.com',
      password: 'password123',
      fullName: 'Іваненко Олена',
      role: "PROCESS_ANALYST",
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: { fullName: 'Коваленко Микола' },
    create: {
      email: 'manager@company.com',
      password: 'password123',
      fullName: 'Коваленко Микола',
      role: "PROCESS_MANAGER",
    },
  })

  const owner = await prisma.user.upsert({
    where: { email: 'owner@company.com' },
    update: { fullName: 'Шевченко Василь' },
    create: {
      email: 'owner@company.com',
      password: 'password123',
      fullName: 'Шевченко Василь',
      role: "PROCESS_OWNER",
    },
  })

  const employee = await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: { fullName: 'Петренко Анна' },
    create: {
      email: 'employee@company.com',
      password: 'password123',
      fullName: 'Петренко Анна',
      role: "EMPLOYEE",
    },
  })

  console.log('✅ Користувачі створені (Всі мають пароль "password123")')

  // ── Ієрархія рівнів процесів (L1 → L2 → L3) ──
  const l1_main = await prisma.processLevel.upsert({
    where: { id: 'l1-main' },
    update: {},
    create: {
      id: 'l1-main',
      name: 'Основні процеси',
      depth: 1,
      adminId: analyst.id,
    },
  })

  const l1_support = await prisma.processLevel.upsert({
    where: { id: 'l1-support' },
    update: {},
    create: {
      id: 'l1-support',
      name: 'Підтримуючі процеси',
      depth: 1,
      adminId: analyst.id,
    },
  })

  const l1_mgmt = await prisma.processLevel.upsert({
    where: { id: 'l1-mgmt' },
    update: {},
    create: {
      id: 'l1-mgmt',
      name: 'Управлінські процеси',
      depth: 1,
      adminId: analyst.id,
    },
  })

  // L2
  const l2_sales = await prisma.processLevel.upsert({
    where: { id: 'l2-sales' },
    update: {},
    create: {
      id: 'l2-sales',
      name: 'Продажі',
      depth: 2,
      parentId: l1_main.id,
    },
  })

  const l2_hr = await prisma.processLevel.upsert({
    where: { id: 'l2-hr' },
    update: {},
    create: {
      id: 'l2-hr',
      name: 'Управління персоналом',
      depth: 2,
      parentId: l1_support.id,
    },
  })

  const l2_finance = await prisma.processLevel.upsert({
    where: { id: 'l2-finance' },
    update: {},
    create: {
      id: 'l2-finance',
      name: 'Фінанси та бухгалтерія',
      depth: 2,
      parentId: l1_support.id,
    },
  })

  // L3
  const l3_retail = await prisma.processLevel.upsert({
    where: { id: 'l3-retail' },
    update: {},
    create: {
      id: 'l3-retail',
      name: 'Роздрібні продажі',
      depth: 3,
      parentId: l2_sales.id,
    },
  })

  console.log('✅ Рівні ієрархії створені (L1/L2/L3)')

  // ── Демо-процес (APPROVED) ──
  const demoProcess = await prisma.process.upsert({
    where: { id: 'demo-process-001' },
    update: {},
    create: {
      id: 'demo-process-001',
      code: 'P-001',
      title: 'Процес обслуговування клієнта в торговій точці',
      processType: "MAIN",
      objective: 'Забезпечити якісне та швидке обслуговування клієнта при здійсненні покупки',
      input: 'Клієнт, який звернувся до торгової точки',
      output: 'Задоволений клієнт, оформлена покупка, чек',
      participants: 'Продавець-консультант, Касир, Адміністратор залу',
      clients: 'Внутрішні: відділ аналітики продажів. Зовнішні: покупці',
      inputSupplier: 'Відділ маркетингу (генерація трафіку)',
      upstreamProcesses: 'P-000 — Маркетинг та залучення клієнтів',
      downstreamProcesses: 'P-002 — Повернення товару, P-003 — Програма лояльності',
      bpmnUrl: 'https://drive.google.com/file/d/example-bpmn-link',
      levelId: l3_retail.id,
      ownerId: owner.id,
      managerId: manager.id,
      version: 1,
      status: "APPROVED",
      approvedAt: new Date('2026-08-01'),
    },
  })

  // Кроки AS-IS демо-процесу
  await prisma.processStep.createMany({
    
    data: [
      {
        id: 'step-001-1',
        processId: demoProcess.id,
        orderIndex: 1,
        phase: 'Аналіз AS IS',
        name: 'Зустріч клієнта',
        description: 'Продавець-консультант вітає клієнта та з\'ясовує його потребу',
        executorRole: 'Продавець-консультант',
        comment: 'Час взаємодії не більше 2 хвилин',
      },
      {
        id: 'step-001-2',
        processId: demoProcess.id,
        orderIndex: 2,
        phase: 'Аналіз AS IS',
        name: 'Підбір товару',
        description: 'Консультант пропонує відповідні товари, відповідає на запитання',
        executorRole: 'Продавець-консультант',
        docUrl: 'https://drive.google.com/file/d/catalog-template',
        comment: 'Використовувати актуальний каталог продукції',
      },
      {
        id: 'step-001-3',
        processId: demoProcess.id,
        orderIndex: 3,
        phase: 'Аналіз AS IS',
        name: 'Оформлення покупки',
        description: 'Касир проводить товар через касову систему, приймає оплату',
        executorRole: 'Касир',
        docUrl: 'https://drive.google.com/file/d/cash-register-instruction',
      },
    ],
  })

  // KPI демо-процесу
  await prisma.processKPI.createMany({
    
    data: [
      {
        id: 'kpi-001-1',
        processId: demoProcess.id,
        name: 'Час обслуговування клієнта',
        unit: 'хвилини',
        dataSource: 'Каса (автоматично)',
        frequency: 'Щоденно',
        targetValue: '≤ 7 хвилин',
      },
      {
        id: 'kpi-001-2',
        processId: demoProcess.id,
        name: 'Індекс задоволеності клієнта (CSI)',
        unit: 'бали (1-10)',
        dataSource: 'Опитування після покупки',
        frequency: 'Щомісяця',
        targetValue: '≥ 8.5',
      },
    ],
  })

  // Лог затвердження
  await prisma.processHistoryLog.createMany({
    
    data: [
      {
        id: 'log-001-1',
        processId: demoProcess.id,
        action: 'СТВОРЕНО',
        userId: manager.id,
        timestamp: new Date('2026-07-15'),
      },
      {
        id: 'log-001-2',
        processId: demoProcess.id,
        action: 'ПОДАНО_НА_ПЕРЕВІРКУ_АНАЛІТИКУ',
        userId: manager.id,
        timestamp: new Date('2026-07-20'),
      },
      {
        id: 'log-001-3',
        processId: demoProcess.id,
        action: 'СХВАЛЕНО_АНАЛІТИКОМ',
        userId: analyst.id,
        timestamp: new Date('2026-07-25'),
        comment: 'Перевірено, відповідає стандартам',
      },
      {
        id: 'log-001-4',
        processId: demoProcess.id,
        action: 'СХВАЛЕНО_ВЛАСНИКОМ',
        userId: owner.id,
        timestamp: new Date('2026-07-30'),
        comment: 'Погоджено',
      },
      {
        id: 'log-001-5',
        processId: demoProcess.id,
        action: 'ЗАТВЕРДЖЕНО',
        userId: analyst.id,
        timestamp: new Date('2026-08-01'),
        comment: 'Внесено в репозиторій',
      },
    ],
  })

  // ── Демо-процес DRAFT (чернетка) ──
  const draftProcess = await prisma.process.upsert({
    where: { id: 'demo-process-002' },
    update: {},
    create: {
      id: 'demo-process-002',
      code: 'P-002',
      title: 'Процес повернення товару',
      processType: "MAIN",
      objective: 'Забезпечити зручне та прозоре повернення товару клієнтом',
      input: 'Звернення клієнта з товаром для повернення',
      output: 'Оформлене повернення, відшкодування клієнту',
      levelId: l3_retail.id,
      ownerId: owner.id,
      managerId: manager.id,
      version: 1,
      status: "DRAFT",
    },
  })

  await prisma.processHistoryLog.createMany({
    
    data: [
      {
        id: 'log-002-1',
        processId: draftProcess.id,
        action: 'СТВОРЕНО',
        userId: manager.id,
        timestamp: new Date('2026-09-01'),
      },
    ],
  })

  // ── Демо-процес PASSPORT_REVIEW_ANALYST ──
  const reviewProcess = await prisma.process.upsert({
    where: { id: 'demo-process-003' },
    update: {},
    create: {
      id: 'demo-process-003',
      code: 'P-003',
      title: 'Процес адаптації нового співробітника',
      processType: "MANAGERIAL",
      objective: 'Ефективна інтеграція нового співробітника в команду та процеси компанії',
      input: 'Підписаний трудовий договір, перший робочий день',
      output: 'Адаптований співробітник, здатний самостійно виконувати обов\'язки',
      levelId: l2_hr.id,
      ownerId: owner.id,
      managerId: manager.id,
      version: 1,
      status: "PASSPORT_REVIEW_ANALYST",
    },
  })

  await prisma.approvalWorkflow.createMany({
    
    data: [
      {
        id: 'workflow-003-1',
        processId: reviewProcess.id,
        stage: "PASSPORT_ANALYST_REVIEW",
        assignedToRole: "PROCESS_ANALYST",
        isCompleted: false,
      },
    ],
  })

  await prisma.processHistoryLog.createMany({
    
    data: [
      {
        id: 'log-003-1',
        processId: reviewProcess.id,
        action: 'СТВОРЕНО',
        userId: manager.id,
        timestamp: new Date('2026-09-05'),
      },
      {
        id: 'log-003-2',
        processId: reviewProcess.id,
        action: 'ПОДАНО_ПАСПОРТ_АНАЛІТИКУ',
        userId: manager.id,
        timestamp: new Date('2026-09-08'),
        comment: 'Готово до перевірки',
      },
    ],
  })

  // ── Демо-процес PASSPORT_REVIEW_OWNER ──
  const reviewOwnerProcess = await prisma.process.upsert({
    where: { id: 'demo-process-004' },
    update: {},
    create: {
      id: 'demo-process-004',
      code: 'P-004',
      title: 'Процес проведення маркетингової кампанії',
      processType: "MAIN",
      objective: 'Залучення нових клієнтів',
      input: 'Бюджет, ідея',
      output: 'Ліди, продажі',
      levelId: l1_main.id,
      ownerId: owner.id,
      managerId: manager.id,
      version: 1,
      status: "PASSPORT_REVIEW_OWNER",
    },
  })

  await prisma.approvalWorkflow.createMany({
    data: [
      {
        id: 'workflow-004-1',
        processId: reviewOwnerProcess.id,
        stage: "PASSPORT_ANALYST_REVIEW",
        assignedToRole: "PROCESS_ANALYST",
        isCompleted: true,
        completedAt: new Date('2026-09-06'),
        comment: 'Аналітик погодив',
      },
      {
        id: 'workflow-004-2',
        processId: reviewOwnerProcess.id,
        stage: "PASSPORT_OWNER_REVIEW",
        assignedToRole: "PROCESS_OWNER",
        isCompleted: false,
      },
    ],
  })

  // ── Демо-процес DRAFT (Власник) ──
  const ownerDraftProcess = await prisma.process.upsert({
    where: { id: 'demo-process-005' },
    update: {},
    create: {
      id: 'demo-process-005',
      code: null,
      title: 'Процес стратегічного планування (Чернетка власника)',
      processType: "MANAGERIAL",
      objective: 'Визначення цілей компанії на рік',
      levelId: l1_mgmt.id,
      ownerId: owner.id,
      managerId: owner.id,
      version: 1,
      status: "DRAFT",
    },
  })

  // ── Генерація додаткових процесів (разом ~30 процесів) ──
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
  const availableLevels = [l2_sales, l2_hr, l2_finance, l3_retail]

  const prefixes = ['Управління', 'Оптимізація', 'Забезпечення', 'Аналіз', 'Контроль', 'Розробка']
  const subjects = ['якості', 'ресурсів', 'персоналу', 'інфраструктури', 'продажів', 'клієнтського досвіду', 'ризиків']

  for (let i = 1; i <= 25; i++) {
    const status = statuses[i % statuses.length]
    const type = processTypes[i % processTypes.length]
    const lvl = availableLevels[i % availableLevels.length]
    const title = `${prefixes[i % prefixes.length]} ${subjects[i % subjects.length]} ${i}`

    const proc = await prisma.process.create({
      data: {
        code: `P-1${i.toString().padStart(2, '0')}`,
        title,
        processType: type,
        objective: `Мета для ${title}`,
        input: 'Вхідні дані процесу',
        output: 'Результат виконання',
        levelId: lvl.id,
        ownerId: owner.id,
        managerId: manager.id,
        version: 1,
        status: status,
        approvedAt: status === 'APPROVED' ? new Date() : null,
      }
    })

    if (status !== 'DRAFT' && status !== 'PASSPORT_REVIEW_ANALYST' && status !== 'PASSPORT_REVIEW_OWNER') {
      await prisma.processStep.create({
        data: {
          processId: proc.id,
          orderIndex: 1,
          name: 'Початковий крок',
          description: 'Опис першого кроку виконання процесу',
          executorRole: 'Відповідальний виконавець',
        }
      })
    }

    if (status.includes('REVIEW') || status.includes('FINAL')) {
      let stage = ''
      let assignedRole = ''
      
      if (status.includes('PASSPORT')) {
        stage = status.includes('ANALYST') ? 'PASSPORT_ANALYST_REVIEW' : 'PASSPORT_OWNER_REVIEW'
        assignedRole = status.includes('ANALYST') ? 'PROCESS_ANALYST' : 'PROCESS_OWNER'
      } else if (status.includes('STEPS')) {
        stage = status.includes('ANALYST') ? 'STEPS_ANALYST_REVIEW' : 'STEPS_OWNER_REVIEW'
        assignedRole = status.includes('ANALYST') ? 'PROCESS_ANALYST' : 'PROCESS_OWNER'
      } else if (status.includes('KPIS')) {
        stage = status.includes('ANALYST') ? 'KPIS_ANALYST_REVIEW' : 'KPIS_OWNER_REVIEW'
        assignedRole = status.includes('ANALYST') ? 'PROCESS_ANALYST' : 'PROCESS_OWNER'
      } else if (status === 'FINAL_APPROVAL_ANALYST') {
        stage = 'FINAL_APPROVAL'
        assignedRole = 'PROCESS_ANALYST'
      }

      if (stage) {
        await prisma.approvalWorkflow.create({
          data: {
            processId: proc.id,
            stage,
            assignedToRole: assignedRole,
            isCompleted: false,
          }
        })
      }
    }
  }

  // Створення тестового сповіщення для менеджера
  await prisma.notification.create({
    data: {
      userId: manager.id,
      title: 'Тестове сповіщення',
      message: 'Це тестове сповіщення для перевірки роботи лічильника та сторінки сповіщень.',
      isRead: false,
    }
  })

  console.log('✅ Демо-процеси створені (30 процесів, APPROVED, DRAFT, IN_REVIEW)')
  console.log('')
  console.log('🎉 Seed завершено успішно!')
  console.log('')
  console.log('📋 Облікові дані для входу (mock auth):')
  console.log('   PROCESS_ANALYST  → analyst@company.com')
  console.log('   PROCESS_MANAGER → manager@company.com')
  console.log('   PROCESS_OWNER  → owner@company.com')
  console.log('   EMPLOYEE       → employee@company.com')
}

main()
  .catch((e) => {
    console.error('❌ Помилка seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
