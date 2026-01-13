'use client';

import { useState, useEffect } from 'react';

export interface Movement {
    id: string;
    productName: string;
    previousValue: number | null;
    newValue: number | null;
    changeType: 'entrada' | 'salida' | 'ajuste';
    columnName: string;
    timestamp: string;
    sheetName?: string;
}

interface MovementHistoryProps {
    isOpen: boolean;
    onClose: () => void;
}

const STORAGE_KEY = 'gestor_stock_movements';

// Helper functions to manage movements in localStorage
export function addMovement(movement: Omit<Movement, 'id' | 'timestamp'>): void {
    const movements = getMovements();
    const newMovement: Movement = {
        ...movement,
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
    };
    movements.unshift(newMovement);
    // Keep only last 100 movements
    const trimmed = movements.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getMovements(): Movement[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function clearMovements(): void {
    localStorage.removeItem(STORAGE_KEY);
}

export default function MovementHistory({ isOpen, onClose }: MovementHistoryProps) {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [filter, setFilter] = useState<'all' | 'entrada' | 'salida' | 'ajuste'>('all');

    useEffect(() => {
        if (isOpen) {
            setMovements(getMovements());
        }
    }, [isOpen]);

    const filteredMovements = movements.filter(m =>
        filter === 'all' || m.changeType === filter
    );

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getChangeIcon = (type: Movement['changeType']) => {
        switch (type) {
            case 'entrada': return '📥';
            case 'salida': return '📤';
            case 'ajuste': return '✏️';
        }
    };

    const getChangeColor = (type: Movement['changeType']) => {
        switch (type) {
            case 'entrada': return 'text-green-400 bg-green-400/10';
            case 'salida': return 'text-red-400 bg-red-400/10';
            case 'ajuste': return 'text-yellow-400 bg-yellow-400/10';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        <div>
                            <h2 className="text-xl font-semibold">Historial de Movimientos</h2>
                            <p className="text-sm text-muted-foreground">
                                Últimos {movements.length} cambios registrados
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 p-4 border-b border-border bg-secondary/30">
                    {(['all', 'entrada', 'salida', 'ajuste'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-all ${filter === type
                                    ? 'bg-primary text-black font-medium'
                                    : 'bg-secondary hover:bg-secondary/80'
                                }`}
                        >
                            {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}

                    <div className="flex-1" />

                    <button
                        onClick={() => {
                            if (confirm('¿Borrar todo el historial?')) {
                                clearMovements();
                                setMovements([]);
                            }
                        }}
                        className="text-sm text-red-400 hover:text-red-300"
                    >
                        Limpiar
                    </button>
                </div>

                {/* Movements List */}
                <div className="overflow-y-auto max-h-[50vh] p-4">
                    {filteredMovements.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <span className="text-4xl block mb-4">📭</span>
                            <p>No hay movimientos registrados</p>
                            <p className="text-sm mt-1">Los cambios en el inventario aparecerán aquí</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredMovements.map((movement) => (
                                <div
                                    key={movement.id}
                                    className="flex items-start gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                >
                                    <div className={`p-2 rounded-lg ${getChangeColor(movement.changeType)}`}>
                                        <span className="text-xl">{getChangeIcon(movement.changeType)}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">{movement.productName}</span>
                                            {movement.sheetName && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                                                    {movement.sheetName}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-medium">{movement.columnName}:</span>{' '}
                                            <span className="text-red-400">{movement.previousValue ?? '—'}</span>
                                            {' → '}
                                            <span className="text-green-400">{movement.newValue ?? '—'}</span>
                                        </p>
                                    </div>

                                    <div className="text-right text-xs text-muted-foreground">
                                        {formatDate(movement.timestamp)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
