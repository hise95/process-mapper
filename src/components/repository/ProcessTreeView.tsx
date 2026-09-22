"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, FileText, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useSearchParams } from 'next/navigation'

interface ProcessNode {
  id: string;
  title: string;
  code: string | null;
  version: string | null;
  approvedAt?: string | null;
}

interface LevelNode {
  id: string;
  name: string;
  depth: number;
  processes?: ProcessNode[];
  children?: LevelNode[];
}

export function ProcessTreeView() {
  const [treeData, setTreeData] = useState<LevelNode[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await fetch("/api/process-levels")
        if (res.ok) {
          const data = await res.json()
          setTreeData(data)
          
          // За замовчуванням відкриваємо тільки L1
          const initialExpanded: Record<string, boolean> = {}
          data.forEach((l1: LevelNode) => {
            initialExpanded[l1.id] = true
          })
          setExpandedNodes(initialExpanded)
        }
      } catch (error) {
        console.error("Помилка завантаження дерева", error)
      } finally {
        setLoading(false)
      }
    }
    fetchTree()
  }, [])

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // Artificial grouping
  const getGroupedData = () => {
    const mgmt: LevelNode = { id: 'group-m', name: 'Управлінські процеси', depth: 0, children: [] };
    const main: LevelNode = { id: 'group-b', name: 'Основні процеси', depth: 0, children: [] };
    const supp: LevelNode = { id: 'group-s', name: 'Сервісні процеси', depth: 0, children: [] };

    treeData.forEach(l1 => {
      if (l1.name.startsWith('M')) mgmt.children!.push(l1);
      else if (l1.name.startsWith('S')) supp.children!.push(l1);
      else main.children!.push(l1);
    });

    return [mgmt, main, supp].filter(g => g.children!.length > 0);
  }

  const groupedTreeData = getGroupedData();

  const renderProcess = (process: ProcessNode) => (
    <div key={process.id} className="flex items-center justify-between p-3 ml-6 mb-2 bg-muted/20 border rounded-md hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3">
        <FileText className="w-4 h-4 text-primary" />
        <Badge variant="outline" className="font-mono">{process.code}</Badge>
        <span className="font-medium text-sm">{process.title}</span>
        <Badge variant="secondary" className="text-[10px]">v{process.version || "1.0"}</Badge>
      </div>
      <div className="flex items-center gap-4">
        {process.approvedAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(process.approvedAt).toLocaleDateString("uk-UA")}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={() => window.location.href = `/repository/${process.id}`}>
          Відкрити
        </Button>
      </div>
    </div>
  )

  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').toLowerCase();

  const filterTree = (nodes: LevelNode[]): LevelNode[] => {
    if (!query) return nodes;

    return nodes.map(node => {
      const filteredChildren = filterTree(node.children || []);
      const filteredProcesses = (node.processes || []).filter(p => 
        p.title.toLowerCase().includes(query) || (p.code && p.code.toLowerCase().includes(query))
      );

      if (filteredChildren.length === 0 && filteredProcesses.length === 0 && !node.name.toLowerCase().includes(query)) {
        return null;
      }

      return {
        ...node,
        children: filteredChildren,
        processes: filteredProcesses
      };
    }).filter(Boolean) as LevelNode[];
  };

  const filteredTree = filterTree(groupedTreeData);

  // If query is present, we might want to auto-expand, but simple approach is just let users click or they will be empty.
  const isAutoExpand = !!query;

  const renderLevel = (level: LevelNode, depth: number) => {
    const isExpanded = isAutoExpand || !!expandedNodes[level.id]
    const hasChildren = (level.children && level.children.length > 0) || (level.processes && level.processes.length > 0)
    
    return (
      <div key={level.id} className="mb-1" style={{ marginLeft: depth > 1 ? "1.5rem" : "0" }}>
        <div 
          className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors group"
          onClick={() => toggleNode(level.id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <div className="w-4 h-4" />
          )}
          <span className="font-semibold">{level.name}</span>
          {depth > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              L{depth}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {depth === 0 && `${level.children?.length || 0} напрямків (L1)`}
            {depth === 1 && `${level.children?.length || 0} піднапрямків (L2)`}
            {depth >= 2 && `${level.processes?.length || 0} процесів`}
          </span>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-1 border-l-2 border-muted ml-2 pl-2">
            {level.children?.map((child: LevelNode) => renderLevel(child, depth + 1))}
            {level.processes?.map((proc: ProcessNode) => renderProcess(proc))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (filteredTree.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8 border border-dashed rounded-lg">
        Немає затверджених процесів у репозиторії
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filteredTree.map(l1 => renderLevel(l1, 0))}
    </div>
  )
}
