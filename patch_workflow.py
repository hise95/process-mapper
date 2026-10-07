import sys

with open("src/lib/workflow.ts", "r") as f:
    code = f.read()

import re

old_sig = """export async function applyTransition(
  processId: string,
  transition: WorkflowTransition,
  user: SessionUser,
  comment?: string
): Promise<void> {"""

new_sig = """export async function applyTransition(
  processId: string,
  transition: WorkflowTransition,
  user: SessionUser,
  comment?: string,
  expectedCurrentStatus?: string // CWE-362: Очікуваний статус для уникнення Race Conditions
): Promise<void> {"""
code = code.replace(old_sig, new_sig)

old_upd = """    // 1. Оновлення статусу
    await tx.process.update({
      where: { id: processId },
      data: {
        status: newStatus,
        ...(transition === 'FINAL_APPROVE' ? { approvedAt: now } : {}),
      },
    })"""

new_upd = """    // 1. Оновлення статусу з атомарною перевіркою (Optimistic Concurrency Control)
    const updateResult = await tx.process.updateMany({
      where: { 
        id: processId,
        ...(expectedCurrentStatus ? { status: expectedCurrentStatus } : {}) 
      },
      data: {
        status: newStatus,
        ...(transition === 'FINAL_APPROVE' ? { approvedAt: now } : {}),
      },
    })
    
    if (updateResult.count === 0) {
      throw new Error('CONCURRENCY_CONFLICT: Стан процесу вже був змінений іншим запитом (Race Condition).');
    }"""
code = code.replace(old_upd, new_upd)

with open("src/lib/workflow.ts", "w") as f:
    f.write(code)
print("Patched workflow applyTransition for Concurrency")
