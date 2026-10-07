import sys

with open("src/app/api/auth/route.ts", "r") as f:
    code = f.read()

import re

old_ldap = """      try {
        const usernameAttribute = process.env.LDAP_USERNAME_ATTRIBUTE || 'userPrincipalName'
        const baseFilter = process.env.LDAP_SEARCH_FILTER
        
        let usernameFilter: string | undefined = undefined
        if (baseFilter) {
          // Якщо вказаний додатковий фільтр (напр. членство в групі), поєднуємо його з логіном
          // (&(&(objectClass=user)(memberOf=CN=...))(userPrincipalName={{username}}))
          usernameFilter = `(&${baseFilter}(${usernameAttribute}={{username}}))`
        }"""

new_ldap = """      try {
        const usernameAttribute = process.env.LDAP_USERNAME_ATTRIBUTE || 'userPrincipalName'
        const baseFilter = process.env.LDAP_SEARCH_FILTER
        
        // CWE-90: LDAP Injection Configuration Validation
        if (!/^[a-zA-Z0-9_-]+$/.test(usernameAttribute)) {
          console.error('FATAL (CWE-90): LDAP_USERNAME_ATTRIBUTE contains invalid characters.');
          return NextResponse.json({ error: 'Помилка конфігурації LDAP'}, { status: 500 });
        }
        
        // RFC 4515 LDAP Escaping
        const escapedEmail = email.replace(/[\\\\*()\\0]/g, (c) => '\\\\' + c.charCodeAt(0).toString(16).padStart(2, '0'));

        let usernameFilter: string | undefined = undefined
        if (baseFilter) {
          let open = 0;
          for (const char of baseFilter) {
            if (char === '(') open++;
            if (char === ')') open--;
            if (open < 0) break;
          }
          if (open !== 0 || !baseFilter.startsWith('(') || !baseFilter.endsWith(')')) {
            console.error('FATAL (CWE-90): LDAP_SEARCH_FILTER is not enclosed correctly.');
            return NextResponse.json({ error: 'Помилка конфігурації LDAP'}, { status: 500 });
          }
          // Поєднуємо екранований email. Ми використовуємо {{username}},
          // якщо бібліотека ldap-authentication його потребує. АЛЕ! Бібліотека `ldap-authentication`
          // сама робить .replace('{{username}}', username). Це означає, що вона вставить 
          // НЕ-екранований email! Тому ми передаємо у опції бібліотеці `username: escapedEmail`, 
          // щоб вона замінила {{username}} на екранований варіант.
          // АЛЕ якщо вона використовує `username` для bind, то bind впаде!
          // Тому ми краще не будемо використовувати {{username}}, а створимо фільтр самі,
          // і не передаватимемо usernameFilter бібліотеці. (Або передамо такий, що не містить {{username}}).
          usernameFilter = `(&${baseFilter}(${usernameAttribute}=${escapedEmail}))`
        } else {
          usernameFilter = `(${usernameAttribute}=${escapedEmail})`
        }"""

if old_ldap in code:
    code = code.replace(old_ldap, new_ldap)
    with open("src/app/api/auth/route.ts", "w") as f:
        f.write(code)
    print("Patched LDAP configuration")
else:
    print("Could not find LDAP block")
