import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from './prisma';

export async function isCompromisedPassword(password: string): Promise<boolean> {
  // k-Anonymity HIBP check (only sends first 5 chars of SHA1)
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'BeeProcess-Enterprise-App' }
    });
    if (!res.ok) return false; // Fail open if API is down
    const text = await res.text();
    const compromisedHashes = text.split('\n');
    for (const line of compromisedHashes) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return true; // Password found in breach database
      }
    }
  } catch (err) {
    console.error('HIBP Check failed:', err);
  }
  return false;
}

export async function checkPasswordHistory(userId: string, plainPassword: string): Promise<boolean> {
  // Fetch last 5 passwords
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  for (const record of history) {
    const isReused = await bcrypt.compare(plainPassword, record.hash);
    if (isReused) return true;
  }
  return false;
}

export async function savePasswordHistory(userId: string, hash: string) {
  await prisma.passwordHistory.create({
    data: { userId, hash }
  });
  
  // Cleanup old history (keep only 5)
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: 5
  });
  
  if (history.length > 0) {
    await prisma.passwordHistory.deleteMany({
      where: { id: { in: history.map(h => h.id) } }
    });
  }
}
