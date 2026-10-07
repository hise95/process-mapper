with open("prisma/seed.ts", "r") as f:
    code = f.read()

bad = """  console.warn('
⚠️ УВАГА: INITIAL_ADMIN_PASSWORD не задано.');
  console.warn(`🔑 Згенеровано тимчасовий випадковий пароль для тестових користувачів: ${initialPassword}
`);"""

good = """  console.warn('\\n⚠️ УВАГА: INITIAL_ADMIN_PASSWORD не задано.');
  console.warn(`🔑 Згенеровано тимчасовий випадковий пароль для тестових користувачів: ${initialPassword}\\n`);"""

if bad in code:
    code = code.replace(bad, good)
    with open("prisma/seed.ts", "w") as f:
        f.write(code)
    print("Fixed syntax")
else:
    print("Not found")
