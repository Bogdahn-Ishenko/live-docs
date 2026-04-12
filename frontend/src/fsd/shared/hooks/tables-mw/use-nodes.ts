"use client";

import { useState, useEffect, useCallback } from "react";
import type { Node, GetNodesResponse, GetNodeDetailsResponse } from "@/fsd/shared/lib/tables-mw/api-types";

interface UseNodesResult {
  nodes: Node[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseNodeDetailsResult {
  node: Node | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch nodes in a space
 */
export function useNodes(spaceId: string | null, type?: number): UseNodesResult {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = useCallback(async () => {
    if (!spaceId) {
      setNodes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ spaceId });
      if (type !== undefined) params.append("type", type.toString());

      const response = await fetch(`/api/tables-mw/nodes?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as GetNodesResponse;
      
      if (data.success) {
        setNodes(data.data.nodes);
      } else {
        setError(data.message || "Failed to fetch nodes");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [spaceId, type]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  return {
    nodes,
    isLoading,
    error,
    refetch: fetchNodes,
  };
}

/**
 * Hook to fetch detailed information about a node
 */
export function useNodeDetails(nodeId: string | null): UseNodeDetailsResult {
  const [node, setNode] = useState<Node | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNodeDetails = useCallback(async () => {
    if (!nodeId) {
      setNode(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tables-mw/nodes/${nodeId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as GetNodeDetailsResponse;
      
      if (data.success) {
        setNode(data.data);
      } else {
        setError(data.message || "Failed to fetch node details");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchNodeDetails();
  }, [fetchNodeDetails]);

  return {
    node,
    isLoading,
    error,
    refetch: fetchNodeDetails,
  };
}

/**
 * Hook to delete a node
 */
export function useDeleteNode() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteNode = useCallback(async (spaceId: string, nodeId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ spaceId, nodeId });
      const response = await fetch(`/api/tables-mw/nodes/delete?${params.toString()}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteNode, isLoading, error };
}
