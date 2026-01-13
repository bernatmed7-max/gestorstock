'use client';

import { useState } from 'react';
import { Product } from '@/types';

interface Sheet {
    id: string;
    name: string;
    products: Product[];
}

interface TabbedInventoryProps {
    initialSheets?: Sheet[];
    onSheetsChange?: (sheets: Sheet[]) => void;
    stockMinimo: number;
    stockIdeal: number;
    stockMaximo: number;
    onProductUpdate?: (sheetId: string, productId: string, field: keyof Product, value: string | number) => void;
    onProductDelete?: (sheetId: string, productId: string) => void;
    onProductAdd?: (sheetId: string) => void;
    renderProductRow: (product: Product, sheetId: string) => React.ReactNode;
}

export default function TabbedInventory({
    initialSheets = [{ id: 'default', name: 'Hoja 1', products: [] }],
    onSheetsChange,
    renderProductRow,
}: TabbedInventoryProps) {
    const [sheets, setSheets] = useState<Sheet[]>(initialSheets);
    const [activeSheetId, setActiveSheetId] = useState(sheets[0]?.id || 'default');
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];

    const addSheet = () => {
        const newSheet: Sheet = {
            id: `sheet-${Date.now()}`,
            name: `Hoja ${sheets.length + 1}`,
            products: [],
        };
        const newSheets = [...sheets, newSheet];
        setSheets(newSheets);
        setActiveSheetId(newSheet.id);
        onSheetsChange?.(newSheets);
    };

    const deleteSheet = (sheetId: string) => {
        if (sheets.length <= 1) return; // Keep at least one sheet

        const newSheets = sheets.filter(s => s.id !== sheetId);
        setSheets(newSheets);

        if (activeSheetId === sheetId) {
            setActiveSheetId(newSheets[0].id);
        }
        onSheetsChange?.(newSheets);
    };

    const startEditingTab = (sheet: Sheet) => {
        setEditingTabId(sheet.id);
        setEditingName(sheet.name);
    };

    const finishEditingTab = () => {
        if (editingTabId && editingName.trim()) {
            const newSheets = sheets.map(s =>
                s.id === editingTabId ? { ...s, name: editingName.trim() } : s
            );
            setSheets(newSheets);
            onSheetsChange?.(newSheets);
        }
        setEditingTabId(null);
        setEditingName('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            finishEditingTab();
        } else if (e.key === 'Escape') {
            setEditingTabId(null);
            setEditingName('');
        }
    };

    return (
        <div className="card p-0 overflow-hidden">
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
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={finishEditingTab}
                                    onKeyDown={handleKeyDown}
                                    className="bg-transparent border-b border-primary outline-none text-sm w-20"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span
                                    className="text-sm font-medium truncate max-w-[120px]"
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        startEditingTab(sheet);
                                    }}
                                >
                                    {sheet.name}
                                </span>
                            )}

                            {/* Product count badge */}
                            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                {sheet.products.length}
                            </span>

                            {/* Delete button (only if more than 1 sheet) */}
                            {sheets.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSheet(sheet.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
                                    title="Eliminar hoja"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add Sheet Button */}
                <button
                    onClick={addSheet}
                    className="flex items-center gap-1 px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors"
                    title="Añadir hoja"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Active Sheet Content */}
            <div className="overflow-x-auto">
                {activeSheet && activeSheet.products.length > 0 ? (
                    <table className="w-full">
                        <thead className="bg-secondary/30">
                            <tr>
                                <th className="text-left p-4 font-medium">Producto</th>
                                <th className="text-left p-4 font-medium">Stock Actual</th>
                                <th className="text-left p-4 font-medium">Coste Unit.</th>
                                <th className="text-left p-4 font-medium">Estado</th>
                                <th className="text-left p-4 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeSheet.products.map((product) => (
                                renderProductRow(product, activeSheet.id)
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                        <p className="text-sm">Esta hoja está vacía</p>
                        <p className="text-xs mt-1">Importa productos o añádelos manualmente</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Hook para manejar las hojas
export function useSheets(initialSheets?: Sheet[]) {
    const [sheets, setSheets] = useState<Sheet[]>(
        initialSheets || [{ id: 'default', name: 'Hoja 1', products: [] }]
    );
    const [activeSheetId, setActiveSheetId] = useState(sheets[0]?.id || 'default');

    const getActiveSheet = () => sheets.find(s => s.id === activeSheetId) || sheets[0];

    const addProductToSheet = (sheetId: string, product: Product) => {
        setSheets(sheets.map(s =>
            s.id === sheetId
                ? { ...s, products: [...s.products, product] }
                : s
        ));
    };

    const updateProductInSheet = (sheetId: string, productId: string, updates: Partial<Product>) => {
        setSheets(sheets.map(s =>
            s.id === sheetId
                ? {
                    ...s,
                    products: s.products.map(p =>
                        p.id === productId ? { ...p, ...updates } : p
                    )
                }
                : s
        ));
    };

    const deleteProductFromSheet = (sheetId: string, productId: string) => {
        setSheets(sheets.map(s =>
            s.id === sheetId
                ? { ...s, products: s.products.filter(p => p.id !== productId) }
                : s
        ));
    };

    const setProductsForSheet = (sheetId: string, products: Product[]) => {
        setSheets(sheets.map(s =>
            s.id === sheetId ? { ...s, products } : s
        ));
    };

    return {
        sheets,
        setSheets,
        activeSheetId,
        setActiveSheetId,
        getActiveSheet,
        addProductToSheet,
        updateProductInSheet,
        deleteProductFromSheet,
        setProductsForSheet,
    };
}
