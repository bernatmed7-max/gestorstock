'use client';

import { useState, useEffect, useCallback } from 'react';

interface SheetData {
    headers: string[];
    rows: Record<string, unknown>[];
    row_count: number;
    synced_at: string;
}

interface GoogleSheetsSyncProps {
    onDataLoaded?: (data: SheetData) => void;
    autoRefresh?: boolean;
    refreshInterval?: number; // in seconds
}

export default function GoogleSheetsSync({
    onDataLoaded,
    autoRefresh = false,
    refreshInterval = 30
}: GoogleSheetsSyncProps) {
    const [sheetData, setSheetData] = useState<SheetData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const fetchSyncedData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/sync/sheets');
            const data = await response.json();

            if (data.success && data.rows) {
                const syncData: SheetData = {
                    headers: data.headers || [],
                    rows: data.rows || [],
                    row_count: data.row_count || 0,
                    synced_at: data.synced_at,
                };
                setSheetData(syncData);
                setLastSync(new Date(data.synced_at));
                onDataLoaded?.(syncData);
            } else {
                setSheetData(null);
            }
        } catch (err) {
            setError('Error al cargar datos sincronizados');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [onDataLoaded]);

    // Initial load
    useEffect(() => {
        fetchSyncedData();
    }, [fetchSyncedData]);

    // Auto refresh
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(fetchSyncedData, refreshInterval * 1000);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, fetchSyncedData]);

    const formatTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return `hace ${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes}min`;
        const hours = Math.floor(minutes / 60);
        return `hace ${hours}h`;
    };

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${sheetData ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                    <div>
                        <h3 className="font-medium">Google Sheets</h3>
                        <p className="text-xs text-muted-foreground">
                            {sheetData
                                ? `${sheetData.row_count} filas • ${sheetData.headers.length} columnas`
                                : 'No conectado'
                            }
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {lastSync && (
                        <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(lastSync)}
                        </span>
                    )}
                    <button
                        onClick={fetchSyncedData}
                        disabled={loading}
                        className="btn btn-secondary text-sm py-1.5 px-3"
                    >
                        {loading ? (
                            <span className="spinner w-4 h-4" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <p className="text-sm text-destructive mb-2">{error}</p>
            )}

            {/* Dynamic Table */}
            {sheetData && sheetData.rows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/50">
                            <tr>
                                {sheetData.headers.map((header, idx) => (
                                    <th key={idx} className="text-left p-3 font-medium whitespace-nowrap">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sheetData.rows.slice(0, 10).map((row, rowIdx) => (
                                <tr key={rowIdx} className="border-t border-border hover:bg-secondary/30">
                                    {sheetData.headers.map((header, colIdx) => (
                                        <td key={colIdx} className="p-3 whitespace-nowrap">
                                            {String(row[header] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sheetData.rows.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-2 bg-secondary/30">
                            Mostrando 10 de {sheetData.rows.length} filas
                        </p>
                    )}
                </div>
            )}

            {!sheetData && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <p className="text-sm">No hay datos sincronizados</p>
                    <p className="text-xs mt-1">Configura n8n para enviar datos desde Google Sheets</p>
                </div>
            )}
        </div>
    );
}
