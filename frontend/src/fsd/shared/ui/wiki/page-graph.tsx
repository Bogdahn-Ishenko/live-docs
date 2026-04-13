'use client';

import { useMemo, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { useRouter } from "next/navigation";

import { useWikiPages } from "@/fsd/shared/hooks/wiki";
import { extractLinksFromContent } from "@/fsd/shared/lib/wiki/types";
import { cn } from "@/fsd/shared/lib/utils";

interface PageGraphProps {
  currentPageId?: string;
  className?: string;
  miniMode?: boolean;
}

interface GraphNodeData {
  label: string;
  slug: string;
  isCurrent: boolean;
}

// Custom node component
function PageNode({ data }: { data: GraphNodeData }) {
  return (
    <div
      className={cn(
        "px-3 py-2 rounded-lg border shadow-sm text-sm font-medium cursor-pointer transition-colors",
        data.isCurrent 
          ? "bg-primary text-primary-foreground border-primary" 
          : "bg-background hover:bg-accent border-border"
      )}
    >
      {data.label}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  page: PageNode,
};

export function PageGraph({ currentPageId, className, miniMode = false }: PageGraphProps) {
  const router = useRouter();
  const { pages } = useWikiPages();
  
  // Build graph data
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node<GraphNodeData>[] = [];
    const edges: Edge[] = [];
    
    // Create page map for quick lookup
    const pageMap = new Map(pages.map(p => [p.recordId, p]));
    const slugToId = new Map(pages.map(p => [p.slug, p.recordId]));
    
    // Create nodes
    pages.forEach((page, index) => {
      const isCurrent = page.recordId === currentPageId;
      
      nodes.push({
        id: page.recordId,
        type: "page",
        position: { 
          x: isCurrent ? 0 : Math.cos(index * 2 * Math.PI / pages.length) * 200,
          y: isCurrent ? 0 : Math.sin(index * 2 * Math.PI / pages.length) * 200
        },
        data: {
          label: page.title || "(Без названия)",
          slug: page.slug,
          isCurrent,
        },
      });
    });
    
    // Create edges from links in content
    pages.forEach((page) => {
      const links = extractLinksFromContent(page.content);
      
      links.forEach((targetSlug) => {
        const targetId = slugToId.get(targetSlug);
        if (targetId && targetId !== page.recordId) {
          edges.push({
            id: `${page.recordId}-${targetId}`,
            source: page.recordId,
            target: targetId,
            animated: true,
            style: { stroke: "#94a3b8", strokeWidth: 1 },
          });
        }
      });
      
      // Also add parent-child relationships
      if (page.parentId && pageMap.has(page.parentId)) {
        edges.push({
          id: `${page.parentId}-${page.recordId}-parent`,
          source: page.parentId,
          target: page.recordId,
          style: { stroke: "#64748b", strokeWidth: 2 },
        });
      }
    });
    
    return { nodes, edges };
  }, [pages, currentPageId]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Handle node click
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<GraphNodeData>) => {
    if (node.data.slug) {
      router.push(`/wiki/${node.data.slug}`);
    }
  }, [router]);
  
  if (pages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground text-sm", className)}>
        Нет страниц для отображения
      </div>
    );
  }
  
  return (
    <div className={cn("relative", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
        className="bg-muted/30"
      >
        <Background color="#94a3b8" gap={16} size={1} />
        {!miniMode && (
          <>
            <Controls />
            <MiniMap 
              nodeColor={(node) => 
                node.data?.isCurrent ? "#3b82f6" : "#94a3b8"
              }
              className="bg-background border rounded-lg shadow-sm"
            />
          </>
        )}
      </ReactFlow>
    </div>
  );
}

// Mini graph for sidebar
export function MiniPageGraph({ currentPageId, className }: PageGraphProps) {
  return (
    <div className={cn("h-48 border rounded-lg overflow-hidden", className)}>
      <PageGraph 
        currentPageId={currentPageId} 
        className="h-full w-full"
        miniMode
      />
    </div>
  );
}
