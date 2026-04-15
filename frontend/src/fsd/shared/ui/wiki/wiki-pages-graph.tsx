"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type NodeTypes,
  useEdgesState,
  useNodesState,
} from "reactflow";
import { cn } from "@/fsd/shared/lib/utils";
import { fetchWikiPagesGraph } from "@/fsd/shared/lib/wiki-pages/api";
import type { WikiPageGraph } from "@/fsd/shared/lib/wiki-pages/types";

interface WikiPagesGraphProps {
  className?: string;
}

interface GraphNodeData {
  label: string;
  slug: string;
}

function PageNode({ data }: { data: GraphNodeData }) {
  return (
    <div className="px-3 py-2 rounded-lg border shadow-sm text-sm font-medium cursor-pointer transition-colors bg-background hover:bg-accent border-border max-w-[200px] truncate">
      {data.label}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  page: PageNode,
};

function computeCircularLayout(
  nodes: WikiPageGraph["nodes"],
): Node<GraphNodeData>[] {
  const radius = Math.max(200, nodes.length * 35);
  return nodes.map((node, index) => {
    const angle = (index * 2 * Math.PI) / Math.max(nodes.length, 1);
    return {
      id: node.slug,
      type: "page",
      position: {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      },
      data: {
        label: node.title || "(Без названия)",
        slug: node.slug,
      },
    };
  });
}

export function WikiPagesGraph({ className }: WikiPagesGraphProps) {
  const router = useRouter();
  const [graph, setGraph] = useState<WikiPageGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialNodes = useMemo(() => {
    if (!graph || graph.nodes.length === 0) return [];
    return computeCircularLayout(graph.nodes);
  }, [graph]);

  const initialEdges = useMemo<Edge[]>(() => {
    if (!graph) return [];
    return graph.edges.map((edge) => ({
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      animated: true,
      style: { stroke: "#94a3b8", strokeWidth: 1.5 },
    }));
  }, [graph]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchWikiPagesGraph()
      .then((data) => {
        if (!cancelled) {
          setGraph(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Ошибка загрузки графа",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialNodes.length) {
      onNodesChange(initialNodes.map((n) => ({ type: "add", item: n })));
    }
  }, [initialNodes, onNodesChange]);

  useEffect(() => {
    if (initialEdges.length) {
      onEdgesChange(initialEdges.map((e) => ({ type: "add", item: e })));
    }
  }, [initialEdges, onEdgesChange]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<GraphNodeData>) => {
      if (node.data.slug) {
        router.push(`/wiki/${encodeURIComponent(node.data.slug)}`);
      }
    },
    [router],
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-muted-foreground text-sm rounded-xl border bg-card h-80",
          className,
        )}
      >
        Загрузка графа связей…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-destructive text-sm rounded-xl border border-destructive/30 bg-destructive/10 h-80",
          className,
        )}
      >
        {error}
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-muted-foreground text-sm rounded-xl border bg-card h-80",
          className,
        )}
      >
        Нет данных для построения графа
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card overflow-hidden h-96",
        className,
      )}
    >
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
        <Controls />
        <MiniMap
          nodeColor={() => "#94a3b8"}
          className="bg-background border rounded-lg shadow-sm"
        />
      </ReactFlow>
    </div>
  );
}
