import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { initialArchitectureData } from '@/lib/architectureData';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let memoryCache: any = null;

function getPossibleFilePaths(): string[] {
  const paths: string[] = [];
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    paths.push(path.join('/tmp', 'architecture.json'));
  }
  paths.push(path.join(process.cwd(), 'prisma', 'architecture.json'));
  return paths;
}

function readArchitecture() {
  if (memoryCache) {
    return memoryCache;
  }

  for (const p of getPossibleFilePaths()) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.cards)) {
          memoryCache = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`Could not read architecture from ${p}:`, e);
    }
  }

  memoryCache = initialArchitectureData;
  return initialArchitectureData;
}

function writeArchitecture(data: any): boolean {
  memoryCache = data;
  let success = false;

  for (const p of getPossibleFilePaths()) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
      success = true;
    } catch (e) {
      console.warn(`Could not write architecture to ${p}:`, e);
    }
  }

  return success;
}

export async function GET() {
  const data = readArchitecture();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || !isAnalystOrAdmin(session.role)) {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });
  }

  try {
    const body = await req.json();
    writeArchitecture(body);
    return NextResponse.json({ success: true, data: body });
  } catch (e) {
    return NextResponse.json({ error: 'Некоректні дані' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  // Скидання до початкового стану
  const session = await getSession();
  if (!session || !isAnalystOrAdmin(session.role)) {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });
  }

  writeArchitecture(initialArchitectureData);
  return NextResponse.json({ success: true, data: initialArchitectureData });
}
