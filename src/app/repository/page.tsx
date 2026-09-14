import { ProcessTreeView } from "@/components/repository/ProcessTreeView"
import { Suspense } from "react"

export default function RepositoryPage() {
  return (
    <div className="container py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-muted-foreground text-lg">
          Затверджені процеси компанії, організовані за рівнями (L1 - L3)
        </p>
      </div>
      
      <div className="bg-card border rounded-lg p-6 min-h-[500px]">
        <Suspense fallback={<div>Завантаження...</div>}>
          <ProcessTreeView />
        </Suspense>
      </div>
    </div>
  )
}
