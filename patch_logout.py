import sys

with open("src/app/api/auth/route.ts", "r") as f:
    code = f.read()

import re

# We want to replace the DELETE function
pattern = re.compile(r"export async function DELETE\(\) \{[\s\S]*?return response\n\}")

new_delete = """export async function DELETE() {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (cookieValue) {
    // Верифікуємо HMAC підпис перед тим, як довіряти ID для видалення (CWE-345)
    const sessionId = verifyValue(cookieValue)
    if (sessionId) {
      await prisma.session.deleteMany({ where: { id: sessionId } })
    }
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}"""

if pattern.search(code):
    code = pattern.sub(new_delete, code)
    with open("src/app/api/auth/route.ts", "w") as f:
        f.write(code)
    print("Patched DELETE")
else:
    print("Not found")

