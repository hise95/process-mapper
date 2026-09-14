import { redirect } from "next/navigation"
import { requireSession } from "@/lib/auth"
import { UserRoleTable } from "@/components/admin/UserRoleTable"
import { LevelAssignmentTree } from "@/components/admin/LevelAssignmentTree"

export default async function AdminPage() {
  let session;
  try {
    session = await requireSession()
  } catch (e) {
    redirect("/")
  }

  if (session?.role !== "ADMIN_ANALYST") {
    redirect("/")
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Адмін-панель</h1>
        <p className="text-muted-foreground">
          Управління користувачами та рівнями процесів
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Управління користувачами</h2>
        <div className="bg-card border rounded-lg p-6">
          <UserRoleTable currentUser={session} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Структура процесів</h2>
        <div className="bg-card border rounded-lg p-6">
          <LevelAssignmentTree />
        </div>
      </section>
    </div>
  )
}
