import sys

with open("src/middleware.ts", "r") as f:
    code = f.read()

import re

old_verify = """    if (!verifyReq.ok) {
      const loginUrl = new URL('/login', req.url)
      const res = NextResponse.redirect(loginUrl, { headers: requestHeaders })
      res.cookies.delete(SESSION_COOKIE)
      res.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
      return res
    }
  } catch (e) {
    // У разі мережевої помилки пропускаємо далі (fallback) – захист спрацює на рівні Server Component
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
  return response;
}"""

new_verify = """    let rotatedCookie: string | null = null;
    if (!verifyReq.ok) {
      const loginUrl = new URL('/login', req.url)
      const res = NextResponse.redirect(loginUrl, { headers: requestHeaders })
      res.cookies.delete(SESSION_COOKIE)
      res.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
      return res
    } else {
      // Якщо auth/me ініціював Session Rotation, забираємо новий Set-Cookie
      rotatedCookie = verifyReq.headers.get('set-cookie');
    }
    
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
    
    if (rotatedCookie) {
      // Прокидуємо новий cookie клієнту (CWE-384)
      response.headers.set('Set-Cookie', rotatedCookie);
    }
    
    return response;
  } catch (e) {
    // У разі мережевої помилки пропускаємо далі (fallback)
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
    return response;
  }
}"""

if old_verify in code:
    code = code.replace(old_verify, new_verify)
    with open("src/middleware.ts", "w") as f:
        f.write(code)
    print("Patched middleware session rotation forwarding")
else:
    print("Could not find verifyReq block in middleware")
