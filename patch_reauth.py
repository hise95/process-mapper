import sys

with open("src/lib/auth.ts", "r") as f:
    code = f.read()

reauth_code = """
import { authenticate } from 'ldap-authentication'
import bcrypt from 'bcrypt'

/**
 * Перевірка поточного пароля для критичних операцій
 */
export async function verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  if (user.authSource === 'LDAP' && process.env.LDAP_URL) {
    try {
      const usernameAttribute = process.env.LDAP_USERNAME_ATTRIBUTE || 'userPrincipalName';
      const baseFilter = process.env.LDAP_SEARCH_FILTER;
      const escapedEmail = user.email.replace(/[\\\\*()\\0]/g, (c) => '\\\\' + c.charCodeAt(0).toString(16).padStart(2, '0'));
      
      let usernameFilter: string | undefined = undefined;
      if (baseFilter) {
        usernameFilter = `(&${baseFilter}(${usernameAttribute}=${escapedEmail}))`;
      } else {
        usernameFilter = `(${usernameAttribute}=${escapedEmail})`;
      }

      const authOptions: any = {
        ldapOpts: { url: process.env.LDAP_URL },
        userPassword: password,
        userSearchBase: process.env.LDAP_BASE_DN || '',
        usernameAttribute,
        usernameFilter,
        username: user.email,
      };

      if (process.env.LDAP_BIND_DN && process.env.LDAP_BIND_PASSWORD) {
        authOptions.adminDn = process.env.LDAP_BIND_DN;
        authOptions.adminPassword = process.env.LDAP_BIND_PASSWORD;
      } else {
        authOptions.userDn = user.email;
      }

      await authenticate(authOptions);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Local auth
  return bcrypt.compare(password, user.password);
}
"""

# Insert at the end of file
code = code + "\n" + reauth_code

# Also need to import authenticate and bcrypt if not imported, wait, let's just use require so we don't mess up imports
reauth_code_safe = """
/**
 * Перевірка поточного пароля для критичних операцій (CWE-287)
 */
export async function verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  if (user.authSource === 'LDAP' && process.env.LDAP_URL) {
    try {
      const { authenticate } = require('ldap-authentication');
      const usernameAttribute = process.env.LDAP_USERNAME_ATTRIBUTE || 'userPrincipalName';
      const baseFilter = process.env.LDAP_SEARCH_FILTER;
      const escapedEmail = user.email.replace(/[\\\\*()\\0]/g, (c: string) => '\\\\' + c.charCodeAt(0).toString(16).padStart(2, '0'));
      
      let usernameFilter: string | undefined = undefined;
      if (baseFilter) {
        usernameFilter = `(&${baseFilter}(${usernameAttribute}=${escapedEmail}))`;
      } else {
        usernameFilter = `(${usernameAttribute}=${escapedEmail})`;
      }

      const authOptions: any = {
        ldapOpts: { url: process.env.LDAP_URL },
        userPassword: password,
        userSearchBase: process.env.LDAP_BASE_DN || '',
        usernameAttribute,
        usernameFilter,
        username: user.email,
      };

      if (process.env.LDAP_BIND_DN && process.env.LDAP_BIND_PASSWORD) {
        authOptions.adminDn = process.env.LDAP_BIND_DN;
        authOptions.adminPassword = process.env.LDAP_BIND_PASSWORD;
      } else {
        authOptions.userDn = user.email;
      }

      await authenticate(authOptions);
      return true;
    } catch (e) {
      return false;
    }
  }

  const bcrypt = require('bcrypt');
  return bcrypt.compare(password, user.password);
}
"""

with open("src/lib/auth.ts", "a") as f:
    f.write("\n" + reauth_code_safe)
print("Patched src/lib/auth.ts with verifyCurrentPassword")
