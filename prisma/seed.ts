// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient()

// Пароль береться з оточення, або генерується випадково, якщо не заданий.
const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || "ChangeMe123!";


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
      password: await bcrypt.hash(initialPassword, 12),
      fullName: 'Системний Адміністратор',
      role: "ADMIN",
    },
  })

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@company.com' },
    update: { role: "PROCESS_ANALYST", fullName: 'Іваненко Олена' },
    create: {
      email: 'analyst@company.com',
      password: await bcrypt.hash(initialPassword, 12),
      fullName: 'Іваненко Олена',
      role: "PROCESS_ANALYST",
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: { fullName: 'Коваленко Микола' },
    create: {
      email: 'manager@company.com',
      password: await bcrypt.hash(initialPassword, 12),
      fullName: 'Коваленко Микола',
      role: "PROCESS_MANAGER",
    },
  })

  const owner = await prisma.user.upsert({
    where: { email: 'owner@company.com' },
    update: { fullName: 'Шевченко Василь' },
    create: {
      email: 'owner@company.com',
      password: await bcrypt.hash(initialPassword, 12),
      fullName: 'Шевченко Василь',
      role: "PROCESS_OWNER",
    },
  })

  const employee = await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: { fullName: 'Петренко Анна' },
    create: {
      email: 'employee@company.com',
      password: await bcrypt.hash(initialPassword, 12),
      fullName: 'Петренко Анна',
      role: "EMPLOYEE",
    },
  })

  console.log('✅ Користувачі створені (Всі користувачі створені з початковим паролем з env)')

  // ── Ієрархія рівнів процесів (L1 → L2 → L3) ──
  console.log('⏳ Створюємо реальні L1 рівні компанії...');
  const l1Names = [
    "B.01 - Дослідження ринку та потреб споживачів",
    "B.02 - Формування та розвиток ціннісної пропозиції",
    "B.03 - Забезпечення торгової точки товаром (supply chain)",
    "B.04 - Забезпечення легкої та комфортної покупки (продажі)",
    "B.05 - Управління лояльністю та життєвим циклом клієнта",
    "B.06 - Розвиток бренду, простору, продукту",
    "B.07 - Створення простору отримання цінності",
    "M.10 - Управління даними",
    "S.01 - Забезпечення фінансами",
    "S.02 - Забезпечення персоналом",
    "S.03 - Технічне забезпечення",
    "S.04 - Забезпечення та підтримка ІТ",
    "S.05 - Юридичний супровід",
    "S.06 - Бухгалтерській та управлінський облік",
    "S.07 - Кадровий облік",
    "S.08 - Забезпечення комплексної системи безпеки",
    "S.09 - Забезпечення внутрішнього контролю та безпеки",
    "S.10 - Тендерний комітет",
    "S.11 - Офіс-менеджмент"
  ];

  let i = 1;
  for (const name of l1Names) {
    await prisma.processLevel.upsert({
      where: { id: "l1-real-" + i },
      update: { name },
      create: {
        id: "l1-real-" + i,
        name,
        depth: 1,
        adminId: analyst.id
      }
    });
    i++;
  }
}

main()
  .catch((e) => {
    console.error('❌ Помилка seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
