function isPrivateIp(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const [p1, p2] = parts.map(Number);
  if (p1 === 10) return true;
  if (p1 === 172 && p2 >= 16 && p2 <= 31) return true;
  if (p1 === 192 && p2 === 168) return true;
  if (p1 === 127) return true;
  if (p1 === 169 && p2 === 254) return true; // link-local
  return false;
}

function getClientIp(forwardedFor, realIp) {
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(i => i.trim()).filter(Boolean);
    // Йдемо з кінця (від найближчого до нас проксі) до початку
    for (let i = ips.length - 1; i >= 0; i--) {
      const ip = ips[i];
      // Пропускаємо приватні IP (внутрішні проксі)
      if (!isPrivateIp(ip)) {
        return ip;
      }
    }
    // Якщо всі IP приватні (наприклад, корпоративна мережа), беремо перший з кінця (найближчий до проксі, або перший не-localhost)
    return ips[ips.length - 1]; 
  }
  return realIp || 'unknown_ip';
}

console.log(getClientIp("8.8.8.8, 192.168.1.5", null)); // 8.8.8.8
console.log(getClientIp("spoofed, 9.9.9.9, 10.0.0.5", null)); // 9.9.9.9
console.log(getClientIp("10.0.0.2, 10.0.0.3", null)); // 10.0.0.3
