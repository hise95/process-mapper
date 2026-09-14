import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const analyst = await prisma.user.findFirst({ where: { email: 'analyst@company.com' }});
  const owner = await prisma.user.findFirst({ where: { email: 'owner@company.com' }});
  
  if (analyst) {
    await prisma.notification.create({ data: { userId: analyst.id, title: 'Новий процес на перевірку', message: 'Процес "Процес адаптації нового співробітника" очікує вашої дії.', linkUrl: '/processes/demo-process-003' } });
  }
  if (owner) {
    await prisma.notification.create({ data: { userId: owner.id, title: 'Процес потребує вашого погодження', message: 'Процес "Процес проведення маркетингової кампанії" перевірено аналітиком.', linkUrl: '/processes/demo-process-004' } });
  }
}
main().finally(() => prisma.$disconnect());
