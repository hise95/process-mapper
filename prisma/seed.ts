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
