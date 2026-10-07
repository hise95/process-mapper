import { NextRequest } from 'next/server';

function isPrivateIp(ip: string): boolean {
  // Базова перевірка для IPv4
  const ipv4Parts = ip.split('.');
  if (ipv4Parts.length === 4) {
    const [p1, p2] = ipv4Parts.map(Number);
    if (p1 === 10) return true;
    if (p1 === 172 && p2 >= 16 && p2 <= 31) return true;
    if (p1 === 192 && p2 === 168) return true;
    if (p1 === 127) return true;
    if (p1 === 169 && p2 === 254) return true;
    if (p1 === 0) return true;
  }
  
  // Базова перевірка для IPv6
  if (ip.includes(':')) {
    if (ip === '::1' || ip === '::') return true;
    const lowerIp = ip.toLowerCase();
    if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) return true;
    if (lowerIp.startsWith('fe8') || lowerIp.startsWith('fe9') || lowerIp.startsWith('fea') || lowerIp.startsWith('feb')) return true;
  }
  
  return false;
}

/**
 * Отримує реальну IP-адресу клієнта, ігноруючи підроблені IP від зловмисників
 * та пропускаючи приватні IP внутрішніх reverse proxies.
 * CWE-345: Insufficient Verification of Data Authenticity
 */
export function getClientIp(req: NextRequest): string {
  // 1. Специфічні заголовки довірених CDN (Cloudflare, Vercel тощо)
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.split(',')[0].trim();

  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();

  // 2. Безпечний парсинг X-Forwarded-For
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(i => i.trim()).filter(Boolean);
    // Йдемо з кінця (від нашого найближчого проксі) до клієнта
    for (let i = ips.length - 1; i >= 0; i--) {
      const ip = ips[i];
      // Пропускаємо всі приватні IP, які належать нашим балансувальникам/проксі
      if (!isPrivateIp(ip)) {
        return ip;
      }
    }
    // Якщо всі IP виявились приватними (напр. клієнт у внутрішній корпоративній мережі), 
    // беремо перший доступний з кінця, оскільки він гарантовано доданий останнім проксі
    return ips[ips.length - 1];
  }

  // 3. X-Real-IP
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown_ip';
}
