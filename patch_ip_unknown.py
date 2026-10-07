import sys

# Update src/lib/ip.ts to try req.ip
with open("src/lib/ip.ts", "r") as f:
    code = f.read()

code = code.replace("return 'unknown_ip';", "return req.ip || 'unknown_ip';")

with open("src/lib/ip.ts", "w") as f:
    f.write(code)

# Update auth/route.ts to handle unknown_ip differently
with open("src/app/api/auth/route.ts", "r") as f:
    auth_code = f.read()

old_ip_check = """    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(`login_ip_${ip}`, 20, 15 * 60 * 1000); // 20 спроб на 15 хв
    
    if (!ipLimit.allowed) {"""

new_ip_check = """    const ip = getClientIp(req);
    // CWE-400: Якщо IP невідомий (без проксі, standalone), збільшуємо ліміт або ігноруємо, 
    // щоб не заблокувати всіх клієнтів в одному bucket (Amplification DoS)
    const limitCount = ip === 'unknown_ip' ? 500 : 20;
    const ipLimit = await checkRateLimit(`login_ip_${ip}`, limitCount, 15 * 60 * 1000); 
    
    if (!ipLimit.allowed) {"""

auth_code = auth_code.replace(old_ip_check, new_ip_check)

with open("src/app/api/auth/route.ts", "w") as f:
    f.write(auth_code)

print("Patched unknown_ip handling")
