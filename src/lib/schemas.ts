import { z } from 'zod';

// Схема для WikiPage (Пункт 24)
export const wikiPageSchema = z.object({
  id: z.string().min(1).max(50).optional(), // Тільки для POST
  title: z.string().min(1, 'Назва обов\'язкова').max(200, 'Назва занадто довга'),
  icon: z.string().max(50).optional().nullable(),
  content: z.string().max(100000, 'Контент занадто великий').optional().nullable(),
  order: z.number().int().optional(),
});
