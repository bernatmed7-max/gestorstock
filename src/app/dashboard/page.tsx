'use client';


import { useState, useCallback, useRef } from 'react';
import { StockCalculation } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { parseExcelFile } from '@/lib/excel';
import EditableSpreadsheet, { DynamicSheet } from '@/components/inventory/EditableSpreadsheet';
import ChartModal from '@/components/charts/ChartModal';
import KPICards from '@/components/dashboard/KPICards';
import PDFExport from '@/components/reports/PDFExport';
import MovementHistory from '@/components/inventory/MovementHistory';
import BarcodeScanner from '@/components/inventory/BarcodeScanner';




export default function DashboardPage() {
    // Spreadsheet state (using DynamicSheet from EditableSpreadsheet)
    const [spreadsheetData, setSpreadsheetData] = useState<DynamicSheet[]>([]);

    // Get current data as simple objects for AI
    const getSpreadsheetDataForAI = useCallback(() => {
        if (spreadsheetData.length === 0) return [];

        // Get active sheet (first one for now)
        const activeSheet = spreadsheetData[0];
        if (!activeSheet) return [];

        // Convert rows to simple objects with column names as keys
        return activeSheet.rows.map(row => {
            const obj: Record<string, unknown> = {};
            activeSheet.columns.forEach(col => {
                obj[col.name] = row.cells[col.id];
            });
            // Add internal selection flag
            obj._selected = row.selected;
            return obj;
        });
    }, [spreadsheetData]);

    const [calculation, setCalculation] = useState<StockCalculation | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Version key to force re-render of spreadsheet on import
    const [sheetVersion, setSheetVersion] = useState(0);
    // Chart modal state
    const [showChartModal, setShowChartModal] = useState(false);
    // Movement history modal state
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    // Barcode scanner modal state
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

    // Handle file import
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const sheets = await parseExcelFile(file);
            setSpreadsheetData(sheets);
            setSheetVersion(v => v + 1);
            setError('');
        } catch (err) {
            console.error(err);
            setError('Error al importar el archivo Excel');
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Stock thresholds (user configurable)
    const [stockMinimo, setStockMinimo] = useState(10);
    const [stockIdeal, setStockIdeal] = useState(50);
    const [stockMaximo, setStockMaximo] = useState(100);

    // Calculate stock status from spreadsheet data
    const handleCalculate = () => {
        const data = getSpreadsheetDataForAI();
        if (data.length === 0) {
            setError('Añade datos a la hoja primero');
            return;
        }

        // Try to find stock-related columns
        const hasStockColumn = data.some(row =>
            'Stock Actual' in row || 'stock_actual' in row || 'Stock' in row
        );

        if (!hasStockColumn) {
            setError('La hoja debe tener una columna de Stock');
            return;
        }

        // Calculate based on available columns
        let totalStock = 0;
        let totalCoste = 0;
        let countWithCost = 0;

        data.forEach(row => {
            const stock = Number(row['Stock Actual'] || row['stock_actual'] || row['Stock'] || 0);
            const cost = Number(row['Coste Unit.'] || row['coste_unitario'] || row['Coste'] || row['Precio'] || 0);
            totalStock += stock;
            if (cost > 0) {
                totalCoste += cost;
                countWithCost++;
            }
        });

        const calculation: StockCalculation = {
            total_productos: data.length,
            total_stock: totalStock,
            media_coste_unitario: countWithCost > 0 ? totalCoste / countWithCost : 0,
            productos_bajo_stock: data.filter(row => {
                const stock = Number(row['Stock Actual'] || row['stock_actual'] || row['Stock'] || 0);
                return stock < stockMinimo;
            }).length,
            productos_stock_correcto: data.filter(row => {
                const stock = Number(row['Stock Actual'] || row['stock_actual'] || row['Stock'] || 0);
                return stock >= stockMinimo && stock <= stockMaximo;
            }).length,
            productos_alto_stock: data.filter(row => {
                const stock = Number(row['Stock Actual'] || row['stock_actual'] || row['Stock'] || 0);
                return stock > stockMaximo;
            }).length,
        };

        setCalculation(calculation);
        setError('');
    };

    // Get selected rows for charting
    const getSelectedData = useCallback(() => {
        if (spreadsheetData.length === 0) return [];
        const activeSheet = spreadsheetData[0];
        const selectedRows = activeSheet.rows.filter(r => r.selected);
        // If nothing selected, use all rows
        const rowsToUse = selectedRows.length > 0 ? selectedRows : activeSheet.rows;
        return rowsToUse.map(row => {
            const obj: Record<string, unknown> = {};
            activeSheet.columns.forEach(col => {
                obj[col.name] = row.cells[col.id];
            });
            return obj;
        });
    }, [spreadsheetData]);

    // Open chart modal
    const handleOpenChart = () => {
        if (spreadsheetData.length === 0 || spreadsheetData[0].rows.length === 0) {
            setError('Añade datos primero para generar gráficos');
            return;
        }
        setShowChartModal(true);
    };

    // Handle barcode scan
    const handleBarcodeScan = (code: string) => {
        // Search for product with this code in the spreadsheet
        if (spreadsheetData.length === 0) return;

        const activeSheet = spreadsheetData[0];
        const foundIndex = activeSheet.rows.findIndex(row => {
            return Object.values(row.cells).some(cellValue =>
                String(cellValue).toLowerCase().includes(code.toLowerCase())
            );
        });

        if (foundIndex >= 0) {
            // Scroll to the found row (if spreadsheet supports it)
            alert(`✅ Producto encontrado en fila ${foundIndex + 1}`);
        } else {
            alert(`❌ No se encontró ningún producto con el código: ${code}`);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Gestiona tu inventario y genera gráficos personalizados
                </p>
            </div>

            {/* KPI Cards - New Feature */}
            <KPICards
                data={getSpreadsheetDataForAI()}
                stockMinimo={stockMinimo}
                stockMaximo={stockMaximo}
            />

            {/* Configuration Section */}
            <div className="card">
                <h2 className="text-xl font-semibold mb-4">Configuración de Stock</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-red-400">
                            Stock Mínimo
                        </label>
                        <input
                            type="number"
                            value={stockMinimo}
                            onChange={(e) => setStockMinimo(Number(e.target.value))}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-yellow-400">
                            Stock Ideal
                        </label>
                        <input
                            type="number"
                            value={stockIdeal}
                            onChange={(e) => setStockIdeal(Number(e.target.value))}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-green-400">
                            Stock Máximo
                        </label>
                        <input
                            type="number"
                            value={stockMaximo}
                            onChange={(e) => setStockMaximo(Number(e.target.value))}
                            className="input"
                        />
                    </div>
                </div>
            </div>

            {/* Actions Section */}
            <div className="card">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${spreadsheetData.length > 0 && spreadsheetData[0]?.rows.length > 0 ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <span className="text-sm text-muted-foreground">
                            {spreadsheetData.length > 0 && spreadsheetData[0]?.rows.length > 0
                                ? `${spreadsheetData[0].rows.length} filas de datos en la hoja activa`
                                : 'Añade datos en la tabla de abajo'
                            }
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx, .xls, .csv"
                            className="hidden"
                        />
                        <button onClick={handleImportClick} className="btn bg-green-600 hover:bg-green-700 text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            IMPORTAR
                        </button>
                        <button onClick={handleCalculate} className="btn btn-primary">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            CALCULAR
                        </button>
                        <button onClick={handleOpenChart} className="btn bg-purple-600 hover:bg-purple-700 text-white">
                            📊 GRÁFICOS
                        </button>

                        {/* New Tools */}
                        <PDFExport
                            data={getSpreadsheetDataForAI()}
                            columns={spreadsheetData[0]?.columns || []}
                            sheetName={spreadsheetData[0]?.name || 'Inventario'}
                            stockMinimo={stockMinimo}
                        />
                        <button
                            onClick={() => setShowHistoryModal(true)}
                            className="btn bg-cyan-600 hover:bg-cyan-700 text-white"
                            title="Ver historial de cambios"
                        >
                            📋 HISTORIAL
                        </button>
                        <button
                            onClick={() => setShowBarcodeScanner(true)}
                            className="btn bg-orange-600 hover:bg-orange-700 text-white"
                            title="Escanear código de barras"
                        >
                            📷 ESCANEAR
                        </button>
                    </div>
                </div>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                    {error}
                </div>
            )}

            {/* Calculation Results */}
            {calculation && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="card text-center">
                        <p className="text-2xl font-bold">{calculation.total_productos}</p>
                        <p className="text-sm text-muted-foreground">Total Productos</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold">{calculation.total_stock}</p>
                        <p className="text-sm text-muted-foreground">Stock Total</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold">{formatCurrency(calculation.media_coste_unitario)}</p>
                        <p className="text-sm text-muted-foreground">Media Coste</p>
                    </div>
                    <div className="card text-center stock-bajo border">
                        <p className="text-2xl font-bold">{calculation.productos_bajo_stock}</p>
                        <p className="text-sm">Bajo Stock</p>
                    </div>
                    <div className="card text-center stock-correcto border">
                        <p className="text-2xl font-bold">{calculation.productos_stock_correcto}</p>
                        <p className="text-sm">Correcto</p>
                    </div>
                    <div className="card text-center stock-alto border">
                        <p className="text-2xl font-bold">{calculation.productos_alto_stock}</p>
                        <p className="text-sm">Alto Stock</p>
                    </div>
                </div>
            )}



            {/* Editable Spreadsheet */}
            <EditableSpreadsheet
                key={sheetVersion}
                initialSheets={spreadsheetData.length > 0 ? spreadsheetData : undefined}
                onChange={setSpreadsheetData}
            />


            {/* Chart Modal */}
            <ChartModal
                isOpen={showChartModal}
                onClose={() => setShowChartModal(false)}
                data={getSelectedData()}
                columns={spreadsheetData[0]?.columns || []}
                allData={getSpreadsheetDataForAI()}
                months={spreadsheetData.map(s => s.name)}
            />

            {/* Movement History Modal */}
            <MovementHistory
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
            />

            {/* Barcode Scanner Modal */}
            <BarcodeScanner
                isOpen={showBarcodeScanner}
                onClose={() => setShowBarcodeScanner(false)}
                onScan={handleBarcodeScan}
            />
        </div>
    );
}

