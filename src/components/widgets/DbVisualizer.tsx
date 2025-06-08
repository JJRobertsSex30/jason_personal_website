import React, { useState, useCallback, useEffect, memo } from 'react';
import type { FC } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  Handle,
  Position,
} from 'reactflow';
import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  Viewport,
  NodeProps,
} from 'reactflow';
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

// --- LOCAL STORAGE ---
const LOCAL_STORAGE_KEY = 'rf-db-visualizer-state';
interface StoredState {
    nodes: Node[];
    edges: Edge[];
    viewport: Viewport;
}
const saveStateToLocalStorage = (state: StoredState) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
};
const loadStateFromLocalStorage = (): StoredState | null => {
    const stateJson = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stateJson ? JSON.parse(stateJson) : null;
};

// --- CUSTOM TABLE NODE ---
const TableNode: FC<NodeProps<{ label: string; columns: DbColumn[] }>> = memo(({ data }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-lg" style={{minWidth: 250}}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
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
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
});

const nodeTypes = {
    table: TableNode,
};

// --- MAIN FLOW COMPONENT ---
const DbVisualizer: React.FC<DbVisualizerProps> = ({ schema }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const { setViewport, getViewport } = useReactFlow();

  useEffect(() => {
    const storedState = loadStateFromLocalStorage();

    if (storedState && storedState.nodes.length > 0) {
        setNodes(storedState.nodes);
        setEdges(storedState.edges);
        setViewport(storedState.viewport);
    } else if (schema?.tables) {
        const initialNodes: Node[] = schema.tables.map((table, i) => ({
            id: table.name,
            type: 'table',
            position: { x: (i % 5) * 350, y: Math.floor(i / 5) * 250 },
            data: { label: table.name, columns: table.columns },
        }));

        const initialEdges: Edge[] = schema.relations.map((rel, i) => ({
            id: `e-${rel.source_table}-${rel.source_column}-${rel.target_table}-${rel.target_column}-${i}`,
            source: rel.source_table,
            target: rel.target_table,
            type: 'smoothstep',
            animated: true,
            label: `${rel.source_column} → ${rel.target_column}`,
        }));
        
        setNodes(initialNodes);
        setEdges(initialEdges);
    }
  }, [schema, setViewport]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
  }, [setNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges]);

  const onMoveEnd = useCallback(() => {
    const viewport = getViewport();
    if (nodes.length > 0) {
        saveStateToLocalStorage({ nodes, edges, viewport });
    }
  }, [nodes, edges, getViewport]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default DbVisualizer; 