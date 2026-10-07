import sys

with open("src/app/api/processes/[id]/kpis/route.ts", "r") as f:
    code = f.read()

old_delete = """  const { kpiId } = await req.json()

  const process = await prisma.process.findUnique({ where: { id } })"""

new_delete = """  const { kpiId } = await req.json()
  if (typeof kpiId !== 'string') return NextResponse.json({ error: 'kpiId має бути рядком' }, { status: 400 })

  const process = await prisma.process.findUnique({ where: { id } })"""

if old_delete in code:
    code = code.replace(old_delete, new_delete)
    with open("src/app/api/processes/[id]/kpis/route.ts", "w") as f:
        f.write(code)
    print("Patched DELETE route in kpis")
else:
    print("Could not find DELETE block in kpis")
