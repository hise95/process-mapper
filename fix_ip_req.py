import sys
with open("src/lib/ip.ts", "r") as f:
    code = f.read()

code = code.replace("return req.ip || 'unknown_ip';", "return (req as any).ip || 'unknown_ip';")

with open("src/lib/ip.ts", "w") as f:
    f.write(code)
print("Fixed req.ip type")
