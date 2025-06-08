import React, { useState, useCallback, useEffect, memo } from 'react';
import type { FC } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  ReactFlowProvider,
} from 'reactflow';
import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  NodeProps,
} from 'reactflow';
import ELK from 'elkjs';
import type { ElkNode } from 'elkjs';
import 'reactflow/dist/style.css';

// --- TYPE DEFINITIONS ---
// These should match the structure from /src/lib/db-schema.ts
interface DbColumn {
    name: string;
    type: string;
    is_nullable: boolean;
    is_primary_key: boolean;
    default_value: string | null;
}
interface DbTable {
  name: string;
  columns: DbColumn[];
}
interface DbRelation {
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
}
interface DbSchema {
  tables: DbTable[];
  relations: DbRelation[];
}
interface DbVisualizerProps {
  schema: DbSchema;
}

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
};

const getLayoutedElements = async (nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
  const elk = new ELK();
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map(node => ({
      ...node,
      width: 250,
      height: 150,
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    })),
  };

  const layoutedGraph = await elk.layout(graph);
  
  const layoutedNodes = layoutedGraph.children!.map((node: ElkNode) => {
    const originalNode = nodes.find(n => n.id === node.id);
    return {
      ...originalNode!,
      position: { x: node.x!, y: node.y! },
    };
  });

  return {
    nodes: layoutedNodes,
    edges: edges,
  };
};

// --- CUSTOM TABLE NODE ---
const TableNode: FC<NodeProps<{ label: string; columns: DbColumn[] }>> = memo(({ data }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-lg" style={{minWidth: 250}}>
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-t-md">
        <strong className="text-lg text-gray-800 dark:text-gray-100">{data.label}</strong>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="float-right text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-1 px-2 rounded">
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
      {!isCollapsed && (
        <div className="p-3 divide-y divide-gray-200 dark:divide-gray-600">
          {data.columns.map((col) => (
            <div key={col.name} className="py-1.5 flex justify-between text-sm">
              <span className={`font-medium ${col.is_primary_key ? 'text-yellow-500' : 'text-gray-700 dark:text-gray-300'}`}>
                {col.is_primary_key ? '🔑 ' : ''}{col.name}
              </span>
              <span className="text-gray-500 dark:text-gray-400">{col.type}</span>
            </div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    </div>
  );
});

const nodeTypes = {
    table: TableNode,
};

// --- MAIN FLOW COMPONENT ---
const Flow: React.FC<DbVisualizerProps> = ({ schema }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (schema?.tables) {
        const initialNodes: Node[] = schema.tables.map((table) => ({
            id: table.name,
            type: 'table',
            position: { x: 0, y: 0 },
            data: { label: table.name, columns: table.columns },
        }));

        const initialEdges: Edge[] = schema.relations.map((rel, i) => ({
            id: `e-${rel.source_table}-${rel.source_column}-${rel.target_table}-${rel.target_column}-${i}`,
            source: rel.source_table,
            target: rel.target_table,
            type: 'smoothstep',
            animated: true,
        }));
        
        getLayoutedElements(initialNodes, initialEdges).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        });
    }
  }, [schema]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
  }, [setNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges]);

  if (!schema) {
      return <div>Loading schema...</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

// --- WRAPPER COMPONENT ---
// We wrap the Flow in a provider so we can use React Flow hooks if needed later.
const DbVisualizer: React.FC<DbVisualizerProps> = ({ schema }) => (
    <ReactFlowProvider>
        <Flow schema={schema} />
    </ReactFlowProvider>
);

export default DbVisualizer; 