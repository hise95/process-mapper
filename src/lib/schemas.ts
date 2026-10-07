import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

// CWE-79: Strict sanitize-html configuration 
// Усунуто iframe, style, id, та data-схеми, щоб уникнути UI redress та XSS
const sanitizeHtmlOptions = {
  allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span', 'img'
  ],
  allowedAttributes: {
    '*': ['class'],
    'a': ['href', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    // Дозволяємо data-схему ТІЛЬКИ для картинок, щоб підтримувати base64
    img: ['http', 'https', 'data']
  }
};

export const wikiPageSchema = z.object({
  id: z.string().min(1).max(50).optional(),
  title: z.string().min(1, 'Назва обов\'язкова').max(200, 'Назва занадто довга'),
  icon: z.string().max(50).optional().nullable(),
  content: z.string().max(100000, 'Контент занадто великий').optional().nullable(),
  order: z.number().int().optional(),
});

export const kpiSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Назва обов\'язкова').max(300),
  unit: z.string().max(100).optional().nullable(),
  dataSource: z.string().max(500).optional().nullable(),
  frequency: z.string().max(100).optional().nullable(),
  targetValue: z.string().max(300).optional().nullable(),
});

export const stepSchema = z.object({
  id: z.string().optional(),
  orderIndex: z.number().int().optional(),
  phase: z.string().max(100).optional().nullable(),
  name: z.string().max(300).optional(),
  description: z.string().max(5000).optional().nullable(),
  executorRole: z.string().max(200).optional().nullable(),
  participantsNote: z.string().max(1000).optional().nullable(),
  docUrl: z.string().max(1000).optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
});

export const processPostSchema = z.object({
  title: z.string().min(1, 'Назва обов\'язкова').max(300),
  processType: z.enum(['MAIN', 'MANAGERIAL', 'SERVICE']).optional(),
  levelId: z.string().max(50).optional().nullable(),
  ownerId: z.string().max(50).optional().nullable(),
  managerId: z.string().max(50).optional().nullable(),
});

export const processPatchSchema = z.object({
  title: z.string().max(300).optional(),
  processType: z.enum(['MAIN', 'MANAGERIAL', 'SERVICE']).optional(),
  code: z.string().max(50).optional().nullable(),
  objective: z.string().max(2000).optional().nullable(),
  input: z.string().max(2000).optional().nullable(),
  output: z.string().max(2000).optional().nullable(),
  participants: z.string().max(2000).optional().nullable(),
  clients: z.string().max(2000).optional().nullable(),
  inputSupplier: z.string().max(2000).optional().nullable(),
  upstreamProcesses: z.string().max(2000).optional().nullable(),
  downstreamProcesses: z.string().max(2000).optional().nullable(),
  levelId: z.string().max(50).optional().nullable(),
  ownerId: z.string().max(50).optional().nullable(),
  managerId: z.string().max(50).optional().nullable(),
  bpmnUrl: z.string().max(1000).optional().nullable(),
});

export const feedbackSchema = z.object({
  type: z.enum(['BUG', 'IDEA', 'QUESTION', 'OTHER']).default('OTHER'),
  message: z.string().min(1).max(5000),
  route: z.string().max(500).optional().nullable(),
});

export const analystTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  processId: z.string().max(50).optional().nullable(),
  assigneeId: z.string().max(50).optional().nullable(),
});

