import sys

with open("src/app/api/architecture/route.ts", "r") as f:
    code = f.read()

import re

# Add Zod import
code = code.replace("import { prisma } from '@/lib/prisma';", "import { prisma } from '@/lib/prisma';\nimport { z } from 'zod';")

old_validate = """function validateArchitectureData(body: any) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Очікується об`єкт JSON');
  }

  // CWE-400: Logical size limit
  const str = JSON.stringify(body);
  if (str.length > 500 * 1024) {
    throw new Error('Дані занадто великі (максимум 500KB)');
  }

  if (body.cards !== undefined && !Array.isArray(body.cards)) {
    throw new Error('Поле cards має бути масивом');
  }

  const cards = body.cards || [];

  // CWE-400: Element count limit
  if (cards.length > 1000) {
    throw new Error('Перевищено ліміт карток (максимум 1000)');
  }

  // Schema validation
  for (const card of cards) {
    if (!card || typeof card !== 'object') {
      throw new Error('Картка має бути об`єктом');
    }
    if (!card.id || typeof card.id !== 'string' || card.id.length > 100) {
      throw new Error('Некоректний або занадто довгий id картки');
    }
    if (!['mgmt', 'main', 'supp'].includes(card.group)) {
      throw new Error('Некоректна група картки (має бути mgmt, main або supp)');
    }
    if (card.title !== undefined && (typeof card.title !== 'string' || card.title.length > 500)) {
      throw new Error('Некоректна або занадто довга назва картки');
    }
    
    // Arrays validation
    for (const field of ['inputs', 'outputs']) {
      if (card[field] !== undefined) {
        if (!Array.isArray(card[field])) throw new Error(`Поле ${field} має бути масивом`);
        if (card[field].length > 150) throw new Error(`Забагато елементів у ${field}`);
        for (const item of card[field]) {
          if (typeof item !== 'string' || item.length > 1000) {
            throw new Error(`Елемент у ${field} має бути рядком до 1000 символів`);
          }
        }
      }
    }
  }
}"""

new_validate = """const cardSchema = z.object({
  id: z.string().min(1).max(100),
  group: z.enum(['mgmt', 'main', 'supp']),
  code: z.string().max(100).optional().nullable(),
  title: z.string().max(500).optional().nullable(),
  owner: z.string().max(300).optional().nullable(),
  inputs: z.array(z.string().max(1000)).max(150).optional().nullable(),
  outputs: z.array(z.string().max(1000)).max(150).optional().nullable(),
}).strict(); // CWE-20: Забороняємо будь-які невідомі поля

const architectureDataSchema = z.object({
  cards: z.array(cardSchema).max(1000)
}).strict(); // Сувора структура

function validateArchitectureData(body: any) {
  // Використовуємо Zod для суворої валідації і заборони unknown properties
  const parseResult = architectureDataSchema.safeParse(body);
  if (!parseResult.success) {
    throw new Error('Некоректні дані: ' + parseResult.error.errors.map(e => e.message).join(', '));
  }
  return parseResult.data;
}"""

if old_validate in code:
    code = code.replace(old_validate, new_validate)
    
    # Also patch PUT
    old_put = """    try {
      validateArchitectureData(body);
    } catch (valErr: any) {
      return NextResponse.json({ error: valErr.message }, { status: 400 });
    }
    
    await prisma.architectureDataStorage.upsert({
      where: { id: 'singleton' },
      update: { data: body as any },
      create: { id: 'singleton', data: body as any },
    });"""
    
    new_put = """    let validatedData;
    try {
      validatedData = validateArchitectureData(body);
    } catch (valErr: any) {
      return NextResponse.json({ error: valErr.message }, { status: 400 });
    }
    
    await prisma.architectureDataStorage.upsert({
      where: { id: 'singleton' },
      update: { data: validatedData as any },
      create: { id: 'singleton', data: validatedData as any },
    });"""
    
    code = code.replace(old_put, new_put)
    
    with open("src/app/api/architecture/route.ts", "w") as f:
        f.write(code)
    print("Patched architecture validation")
else:
    print("Could not find validateArchitectureData block")
