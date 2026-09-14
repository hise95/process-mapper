import { requireSession } from "@/lib/auth"
import { ApprovalSplitScreen } from "@/components/approvals/ApprovalSplitScreen"
import { redirect } from "next/navigation"

export default async function ApprovalsPage() {
  // Отримуємо сесію на сервері
  const session = await requireSession().catch(() => null)
  
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="h-[calc(100vh-5.5rem)] w-full pb-2">
      <ApprovalSplitScreen session={session} />
    </div>
  )
}
