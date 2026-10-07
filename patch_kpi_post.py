import sys

with open("src/app/api/processes/[id]/kpis/route.ts", "r") as f:
    code = f.read()

old_post = """  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Назва показника обов\\'язкова' }, { status: 400 })

  const kpi = await prisma.processKPI.create({
    data: {
      processId: id,
      name: body.name,
      unit: body.unit ?? null,
      dataSource: body.dataSource ?? null,
      frequency: body.frequency ?? null,
      targetValue: body.targetValue ?? null,
    },
  })"""

new_post = """  const rawBody = await req.json()
  const parseResult = kpiSchema.safeParse(rawBody)
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Некоректні дані', details: parseResult.error.format() }, { status: 400 })
  }
  const body = parseResult.data

  const kpi = await prisma.processKPI.create({
    data: {
      processId: id,
      name: body.name,
      unit: body.unit ?? null,
      dataSource: body.dataSource ?? null,
      frequency: body.frequency ?? null,
      targetValue: body.targetValue ?? null,
    },
  })"""

if old_post in code:
    code = code.replace(old_post, new_post)
    with open("src/app/api/processes/[id]/kpis/route.ts", "w") as f:
        f.write(code)
    print("Patched POST route in kpis")
else:
    print("Could not find POST block in kpis")
