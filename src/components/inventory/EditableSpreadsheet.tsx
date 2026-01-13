'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// Dynamic cell value type
type CellValue = string | number | null;

// Column definition
interface Column {
    id: string;
    name: string;
    type: 'text' | 'number';
}

// Row is a record of column id to cell value
interface Row {
    id: string;
    cells: Record<string, CellValue>;
    selected?: boolean;
}

// Sheet with dynamic columns
interface DynamicSheet {
    id: string;
    name: string;
    columns: Column[];
    rows: Row[];
}

interface EditableSpreadsheetProps {
    initialSheets?: DynamicSheet[];
    onChange?: (sheets: DynamicSheet[]) => void;
}

// Default columns for inventory
const DEFAULT_COLUMNS: Column[] = [
    { id: 'nombre', name: 'Producto', type: 'text' },
    { id: 'stock_actual', name: 'Stock Actual', type: 'number' },
    { id: 'stock_minimo', name: 'Stock Mínimo', type: 'number' },
    { id: 'stock_maximo', name: 'Stock Máximo', type: 'number' },
    { id: 'coste', name: 'Coste Unit.', type: 'number' },
];

// Month names in Spanish for default sheets
const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Create default monthly sheets
const createDefaultSheets = (): DynamicSheet[] => {
    return MONTH_NAMES.map((month, idx) => ({
        id: `month-${idx + 1}`,
        name: month,
        columns: [...DEFAULT_COLUMNS],
        rows: [],
    }));
};

export default function EditableSpreadsheet({
    initialSheets,
    onChange
}: EditableSpreadsheetProps) {
    const [sheets, setSheets] = useState<DynamicSheet[]>(
        initialSheets || createDefaultSheets()
    );
    const [activeSheetId, setActiveSheetId] = useState(sheets[0]?.id || 'default');
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingTabName, setEditingTabName] = useState('');
    const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
    const [editingColumnName, setEditingColumnName] = useState('');
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'column' | 'row'; id: string } | null>(null);

    const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];

    const toggleColumnType = (columnId: string) => {
        updateSheets(sheets.map(s =>
            s.id === activeSheetId
                ? {
                    ...s,
                    columns: s.columns.map(c =>
                        c.id === columnId
                            ? { ...c, type: c.type === 'text' ? 'number' : 'text' }
                            : c
                    )
                }
                : s
        ));
        setContextMenu(null);
    };

    // Update sheets and notify parent
    const updateSheets = useCallback((newSheets: DynamicSheet[]) => {
        setSheets(newSheets);
        onChange?.(newSheets);
    }, [onChange]);

    // Sheet management
    const addSheet = () => {
        const newSheet: DynamicSheet = {
            id: `sheet-${Date.now()}`,
            name: `Hoja ${sheets.length + 1}`,
            columns: [...DEFAULT_COLUMNS],
            rows: [],
        };
        updateSheets([...sheets, newSheet]);
        setActiveSheetId(newSheet.id);
    };

    const deleteSheet = (sheetId: string) => {
        if (sheets.length <= 1) return;
        const newSheets = sheets.filter(s => s.id !== sheetId);
        updateSheets(newSheets);
        if (activeSheetId === sheetId) {
            setActiveSheetId(newSheets[0].id);
        }
    };

    const renameSheet = (sheetId: string, newName: string) => {
        updateSheets(sheets.map(s =>
            s.id === sheetId ? { ...s, name: newName } : s
        ));
    };

    // Column management
    const addColumn = (afterColumnId?: string) => {
        const newColumn: Column = {
            id: `col-${Date.now()}`,
            name: `Columna ${activeSheet.columns.length + 1}`,
            type: 'text',
        };

        const newColumns = afterColumnId
            ? [...activeSheet.columns]
            : [...activeSheet.columns, newColumn];

        if (afterColumnId) {
            const idx = newColumns.findIndex(c => c.id === afterColumnId);
            newColumns.splice(idx + 1, 0, newColumn);
        }

        // Add empty cell to all rows
        const newRows = activeSheet.rows.map(row => ({
            ...row,
            cells: { ...row.cells, [newColumn.id]: null },
        }));

        updateSheets(sheets.map(s =>
            s.id === activeSheetId
                ? { ...s, columns: newColumns, rows: newRows }
                : s
        ));
        setContextMenu(null);
    };

    const deleteColumn = (columnId: string) => {
        if (activeSheet.columns.length <= 1) return;

        const newColumns = activeSheet.columns.filter(c => c.id !== columnId);
        const newRows = activeSheet.rows.map(row => {
            const { [columnId]: _, ...restCells } = row.cells;
            return { ...row, cells: restCells };
        });

        updateSheets(sheets.map(s =>
            s.id === activeSheetId
                ? { ...s, columns: newColumns, rows: newRows }
                : s
        ));
        setContextMenu(null);
    };

    const renameColumn = (columnId: string, newName: string) => {
        updateSheets(sheets.map(s =>
            s.id === activeSheetId
                ? {
                    ...s,
                    columns: s.columns.map(c =>
                        c.id === columnId ? { ...c, name: newName } : c
                    )
                }
                : s
        ));
    };

    // Row management
    const addRow = (afterRowId?: string) => {
        const newRow: Row = {
            id: `row-${Date.now()}`,
            cells: Object.fromEntries(activeSheet.columns.map(c => [c.id, null])),
        };

        let newRows: Row[];
        if (afterRowId) {
            const idx = activeSheet.rows.findIndex(r => r.id === afterRowId);
            newRows = [...activeSheet.rows];
            newRows.splice(idx + 1, 0, newRow);
        } else {
            newRows = [...activeSheet.rows, newRow];
        }

        updateSheets(sheets.map(s =>
            s.id === activeSheetId ? { ...s, rows: newRows } : s
        ));
        setContextMenu(null);
    };

    const deleteRow = (rowId: string) => {
        updateSheets(sheets.map(s =>
            s.id === activeSheetId
                ? { ...s, rows: s.rows.filter(r => r.id !== rowId) }
                : s
        ));
        setContextMenu(null);
    };

    // Cell editing
    const updateCell = (rowId: string, columnId: string, value: CellValue) => {
        updateSheets(sheets.map(s =>
            s.id === activeSheetId
                ? {
                    ...s,
                    rows: s.rows.map(r =>
                        r.id === rowId
                            ? { ...r, cells: { ...r.cells, [columnId]: value } }
                            : r
                    )
                }
                : s
        ));
    };

    // Row selection
    const toggleSelectRow = (rowId: string) => {
        updateSheets(sheets.map(s =>
            s.id === activeSheetId
                ? {
                    ...s,
                    rows: s.rows.map(r => r.id === rowId ? { ...r, selected: !r.selected } : r)
                }
                : s
        ));
    };

    const toggleSelectAll = () => {
        const allSelected = activeSheet.rows.every(r => r.selected);
        updateSheets(sheets.map(s =>
            s.id === activeSheetId
                ? {
                    ...s,
                    rows: s.rows.map(r => ({ ...r, selected: !allSelected }))
                }
                : s
        ));
    };

    // Context menu handler
    const handleContextMenu = (e: React.MouseEvent, type: 'column' | 'row', id: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, type, id });
    };

    // Close context menu on click outside
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className="card overflow-hidden p-0">
            {/* Tabs Bar */}
            <div className="flex items-center bg-secondary/50 border-b border-border overflow-x-auto">
                <div className="flex items-center flex-1 min-w-0">
                    {sheets.map((sheet) => (
                        <div
                            key={sheet.id}
                            className={`group flex items-center gap-2 px-4 py-2.5 border-r border-border cursor-pointer transition-colors ${activeSheetId === sheet.id
                                ? 'bg-card text-foreground'
                                : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                                }`}
                            onClick={() => setActiveSheetId(sheet.id)}
                        >
                            {editingTabId === sheet.id ? (
                                <input
                                    type="text"
                                    value={editingTabName}
                                    onChange={(e) => setEditingTabName(e.target.value)}
                                    onBlur={() => {
                                        if (editingTabName.trim()) renameSheet(sheet.id, editingTabName.trim());
                                        setEditingTabId(null);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            if (editingTabName.trim()) renameSheet(sheet.id, editingTabName.trim());
                                            setEditingTabId(null);
                                        }
                                        if (e.key === 'Escape') setEditingTabId(null);
                                    }}
                                    className="bg-transparent border-b border-primary outline-none text-sm w-20"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span
                                    className="text-sm font-medium truncate max-w-[120px]"
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTabId(sheet.id);
                                        setEditingTabName(sheet.name);
                                    }}
                                >
                                    {sheet.name}
                                </span>
                            )}

                            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                {sheet.rows.length}
                            </span>

                            {sheets.length > 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteSheet(sheet.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <button onClick={addSheet} className="px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-card/50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Spreadsheet */}
            <div className="overflow-auto max-h-[500px]">
                <table className="w-full border-collapse">
                    <thead className="bg-secondary/30 sticky top-0 z-10">
                        <tr>
                            <th className="w-10 p-2 text-center border-r border-b border-border">
                                <input
                                    type="checkbox"
                                    checked={activeSheet.rows.length > 0 && activeSheet.rows.every(r => r.selected)}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                />
                            </th>
                            <th className="w-10 p-2 text-center text-xs text-muted-foreground border-r border-b border-border">#</th>
                            {activeSheet.columns.map((col) => (
                                <th
                                    key={col.id}
                                    className="p-2 text-left text-sm font-medium border-r border-b border-border min-w-[120px] group cursor-context-menu"
                                    onContextMenu={(e) => handleContextMenu(e, 'column', col.id)}
                                >
                                    {editingColumnId === col.id ? (
                                        <input
                                            type="text"
                                            value={editingColumnName}
                                            onChange={(e) => setEditingColumnName(e.target.value)}
                                            onBlur={() => {
                                                if (editingColumnName.trim()) renameColumn(col.id, editingColumnName.trim());
                                                setEditingColumnId(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    if (editingColumnName.trim()) renameColumn(col.id, editingColumnName.trim());
                                                    setEditingColumnId(null);
                                                }
                                                if (e.key === 'Escape') setEditingColumnId(null);
                                            }}
                                            className="bg-transparent border-b border-primary outline-none text-sm w-full"
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <span
                                                className="truncate"
                                                onDoubleClick={() => {
                                                    setEditingColumnId(col.id);
                                                    setEditingColumnName(col.name);
                                                }}
                                            >
                                                {col.name}
                                            </span>
                                            <span className="opacity-0 group-hover:opacity-50 text-xs">⋮</span>
                                        </div>
                                    )}
                                </th>
                            ))}
                            <th className="w-10 p-2 border-b border-border">
                                <button
                                    onClick={() => addColumn()}
                                    className="p-1 text-muted-foreground hover:text-foreground"
                                    title="Añadir columna"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeSheet.rows.map((row, rowIndex) => (
                            <tr
                                key={row.id}
                                className="hover:bg-secondary/20 group/row"
                                onContextMenu={(e) => handleContextMenu(e, 'row', row.id)}
                            >
                                <td className="p-2 text-center border-r border-b border-border bg-secondary/10">
                                    <input
                                        type="checkbox"
                                        checked={!!row.selected}
                                        onChange={() => toggleSelectRow(row.id)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                    />
                                </td>
                                <td className="p-2 text-center text-xs text-muted-foreground border-r border-b border-border bg-secondary/10">
                                    <div className="flex items-center justify-center gap-1">
                                        <span>{rowIndex + 1}</span>
                                        <button
                                            onClick={() => deleteRow(row.id)}
                                            className="opacity-0 group-hover/row:opacity-100 p-0.5 hover:text-destructive"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                                {activeSheet.columns.map((col) => (
                                    <td key={col.id} className="p-0 border-r border-b border-border">
                                        <input
                                            type={col.type === 'number' ? 'number' : 'text'}
                                            value={row.cells[col.id] ?? ''}
                                            onChange={(e) => updateCell(
                                                row.id,
                                                col.id,
                                                col.type === 'number' ? Number(e.target.value) || null : e.target.value
                                            )}
                                            className="w-full p-2 bg-transparent border-0 outline-none focus:bg-primary/5 text-sm"
                                            placeholder="-"
                                        />
                                    </td>
                                ))}
                                <td className="border-b border-border"></td>
                            </tr>
                        ))}
                        {/* Add row button */}
                        <tr>
                            <td
                                colSpan={activeSheet.columns.length + 3}
                                className="p-2 text-center border-b border-border"
                            >
                                <button
                                    onClick={() => addRow()}
                                    className="flex items-center justify-center gap-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 rounded transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Añadir fila
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.type === 'column' && (
                        <>
                            <button
                                onClick={() => { setEditingColumnId(contextMenu.id); setEditingColumnName(activeSheet.columns.find(c => c.id === contextMenu.id)?.name || ''); setContextMenu(null); }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50"
                            >
                                ✏️ Renombrar columna
                            </button>
                            <button
                                onClick={() => toggleColumnType(contextMenu.id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50"
                            >
                                🔄 Cambiar a {activeSheet.columns.find(c => c.id === contextMenu.id)?.type === 'text' ? 'Número' : 'Texto'}
                            </button>
                            <button
                                onClick={() => addColumn(contextMenu.id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50"
                            >
                                ➕ Insertar columna a la derecha
                            </button>
                            {activeSheet.columns.length > 1 && (
                                <button
                                    onClick={() => deleteColumn(contextMenu.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 text-destructive"
                                >
                                    🗑️ Eliminar columna
                                </button>
                            )}
                        </>
                    )}
                    {contextMenu.type === 'row' && (
                        <>
                            <button
                                onClick={() => addRow(contextMenu.id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50"
                            >
                                ➕ Insertar fila debajo
                            </button>
                            <button
                                onClick={() => deleteRow(contextMenu.id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 text-destructive"
                            >
                                🗑️ Eliminar fila
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Footer info */}
            <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 border-t border-border text-xs text-muted-foreground">
                <span>{activeSheet.rows.length} filas × {activeSheet.columns.length} columnas</span>
                <span>Clic derecho para más opciones</span>
            </div>
        </div>
    );
}

// Export types for use in other components
export type { DynamicSheet, Column, Row, CellValue };
