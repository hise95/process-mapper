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
    update: { role: "ADMIN" },
    create: {
      email: 'admin@company.com',
      password: 'password123',
      fullName: 'Системний Адміністратор',
      role: "ADMIN",
    },
  })

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@company.com' },
    update: { role: "PROCESS_ANALYST" },
    create: {
      email: 'analyst@company.com',
      password: 'password123',
      fullName: 'Іваненко Олена (Процесний аналітик)',
      role: "PROCESS_ANALYST",
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: {
      email: 'manager@company.com',
      password: 'password123',
      fullName: 'Коваленко Микола (Менеджер процесу)',
      role: "PROCESS_MANAGER",
    },
  })

  const owner = await prisma.user.upsert({
    where: { email: 'owner@company.com' },
    update: {},
    create: {
      email: 'owner@company.com',
      password: 'password123',
      fullName: 'Шевченко Василь (Власник процесу)',
      role: "PROCESS_OWNER",
    },
  })

  const employee = await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: {},
    create: {
      email: 'employee@company.com',
      password: 'password123',
      fullName: 'Петренко Анна (Працівник)',
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
        assignedToRole: "ADMIN_ANALYST",
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
        assignedToRole: "ADMIN_ANALYST",
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

  console.log('✅ Демо-процеси створені (APPROVED, DRAFT, IN_REVIEW)')
  console.log('')
  console.log('🎉 Seed завершено успішно!')
  console.log('')
  console.log('📋 Облікові дані для входу (mock auth):')
  console.log('   ADMIN_ANALYST  → analyst@company.com')
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
