'use client';

import { useState, useCallback } from 'react';
import ReactFlow, {
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Connection,
    Edge,
    Node,
    NodeChange,
    EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
    {
        id: '1',
        type: 'input',
        data: { label: 'Trigger: Nuevo Mensaje' },
        position: { x: 250, y: 5 },
        style: { background: '#262626', color: '#e5e5e5', border: '1px solid #3b82f6' },
    },
    {
        id: '2',
        data: { label: 'Filtrar: Contiene "Precio"' },
        position: { x: 100, y: 100 },
        style: { background: '#262626', color: '#e5e5e5' },
    },
    {
        id: '3',
        data: { label: 'Acción: Enviar Catálogo' },
        position: { x: 400, y: 100 },
        style: { background: '#262626', color: '#e5e5e5' },
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e1-3', source: '1', target: '3' },
];

export default function AutomationsPage() {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );
    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        []
    );

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-[#0f0f0f]">
            <div className="bg-[#1a1a1a] border-b border-[#262626] p-4 flex justify-between items-center">
                <h1 className="text-xl font-light text-[#e5e5e5]">Editor de Flujos</h1>
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-[#262626] text-[#e5e5e5] rounded text-sm hover:bg-[#333]">
                        Cancelar
                    </button>
                    <button className="px-3 py-1.5 bg-[#4ade80] text-[#0f0f0f] rounded text-sm font-medium hover:bg-[#22c55e]">
                        Guardar Flujo
                    </button>
                </div>
            </div>
            <div className="flex-1 w-full">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                    className="bg-[#0f0f0f]"
                >
                    <Background color="#333" gap={16} />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
}
