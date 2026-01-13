'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Types for the chart modal
interface Column {
    id: string;
    name: string;
    type: 'text' | 'number';
}

interface RowData {
    [key: string]: unknown;
}

interface ChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: RowData[];
    columns: Column[];
    allData?: RowData[]; // All data for product selection
    clients?: string[]; // Available clients for filtering
    months?: string[]; // Available months for filtering
}

type ChartType = 'bar' | 'line' | 'pie';

// Color palette for multiple series
const COLORS = [
    '#6366f1', // indigo
    '#8b5cf6', // purple
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#3b82f6', // blue
    '#ec4899', // pink
    '#14b8a6', // teal
];

const CHART_TYPES = [
    { id: 'bar' as ChartType, label: 'Barras', icon: '📊', desc: 'Compara valores lado a lado' },
    { id: 'line' as ChartType, label: 'Líneas', icon: '📈', desc: 'Muestra tendencias' },
    { id: 'pie' as ChartType, label: 'Circular', icon: '🥧', desc: 'Distribución porcentual' },
];

export default function ChartModal({ isOpen, onClose, data, columns, allData, clients = [], months = [] }: ChartModalProps) {
    // Step tracking
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Chart Type
    const [chartType, setChartType] = useState<ChartType>('bar');

    // Step 2: Product Selection
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [productLabelColumn, setProductLabelColumn] = useState('');

    // Step 3: Value Columns
    const [labelColumn, setLabelColumn] = useState('');
    const [valueColumns, setValueColumns] = useState<string[]>([]);

    // Step 4: Filters
    const [filterClient, setFilterClient] = useState('');
    const [filterMonth, setFilterMonth] = useState('');

    // Chart theme (light = white background, dark = black background)
    const [chartTheme, setChartTheme] = useState<'light' | 'dark'>('light');

    const chartRef = useRef<HTMLDivElement>(null);

    // Get text columns for labels
    const textColumns = columns.filter(c => c.type === 'text');
    // Get number columns for values (exclude Fecha columns)
    const numberColumns = columns.filter(c =>
        c.type === 'number' &&
        !c.name.toLowerCase().includes('fecha')
    );

    // Working data (either passed data or allData)
    const workingData = allData || data;

    // Get unique values for filters
    const availableClients = useMemo(() => {
        const clientCol = columns.find(c => c.name.toLowerCase().includes('cliente') || c.name.toLowerCase().includes('proveedor'));
        if (!clientCol) return [];
        const values = new Set(workingData.map(row => String(row[clientCol.name] || '')).filter(Boolean));
        return Array.from(values);
    }, [workingData, columns]);

    // Initialize product label column
    useEffect(() => {
        if (columns.length > 0 && !productLabelColumn) {
            const col = columns.find(c =>
                c.name.toLowerCase().includes('producto') ||
                c.name.toLowerCase().includes('nombre') ||
                c.type === 'text'
            );
            setProductLabelColumn(col?.name || columns[0]?.name || '');
        }
    }, [columns, productLabelColumn]);

    // Filter products by search term and exclude empty rows
    const filteredProducts = useMemo(() => {
        // First filter out rows with empty product names
        const nonEmptyData = workingData.filter(row => {
            const label = String(row[productLabelColumn] || '').trim();
            return label !== '';
        });

        if (!searchTerm) return nonEmptyData;
        return nonEmptyData.filter(row => {
            const label = String(row[productLabelColumn] || '');
            return label.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [workingData, searchTerm, productLabelColumn]);

    // Auto-select first options on mount (but NOT products - start with none selected)
    useEffect(() => {
        if (textColumns.length > 0 && !labelColumn) {
            setLabelColumn(textColumns[0].name);
        }
        if (numberColumns.length > 0 && valueColumns.length === 0) {
            setValueColumns([numberColumns[0].name]);
        }
    }, [columns, textColumns, numberColumns, labelColumn, valueColumns.length]);

    // Prepare chart data based on selections and filters
    const chartData = useMemo(() => {
        let filtered = workingData.filter((_, idx) => selectedProducts.has(idx));

        // Apply client filter
        if (filterClient) {
            const clientCol = columns.find(c => c.name.toLowerCase().includes('cliente') || c.name.toLowerCase().includes('proveedor'));
            if (clientCol) {
                filtered = filtered.filter(row => String(row[clientCol.name]) === filterClient);
            }
        }

        return filtered.map(row => {
            const item: Record<string, unknown> = {
                name: row[labelColumn] || 'Sin nombre',
            };
            valueColumns.forEach(col => {
                item[col] = Number(row[col]) || 0;
            });
            return item;
        });
    }, [workingData, selectedProducts, filterClient, labelColumn, valueColumns, columns]);

    // Toggle product selection
    const toggleProduct = (idx: number) => {
        const newSet = new Set(selectedProducts);
        if (newSet.has(idx)) {
            newSet.delete(idx);
        } else {
            newSet.add(idx);
        }
        setSelectedProducts(newSet);
    };

    // Select/Deselect all products
    const toggleAllProducts = () => {
        if (selectedProducts.size === filteredProducts.length) {
            setSelectedProducts(new Set());
        } else {
            setSelectedProducts(new Set(workingData.map((_, idx) => idx)));
        }
    };

    // Toggle value column selection
    const toggleValueColumn = (colName: string) => {
        setValueColumns(prev =>
            prev.includes(colName)
                ? prev.filter(c => c !== colName)
                : [...prev, colName]
        );
    };

    // Download chart as PNG
    const downloadChart = async () => {
        if (!chartRef.current) return;

        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(chartRef.current, {
                backgroundColor: chartTheme === 'light' ? '#ffffff' : '#111827',
                scale: 2,
            });

            const link = document.createElement('a');
            link.download = `grafico-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Error exporting chart:', err);
        }
    };

    // Navigation
    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                {/* Header with Steps */}
                <div className="border-b border-border">
                    <div className="flex items-center justify-between p-4">
                        <h2 className="text-xl font-semibold">📊 Generador de Gráficos</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex px-4 pb-4 gap-2">
                        {[
                            { num: 1, label: 'Tipo de Gráfico' },
                            { num: 2, label: 'Productos' },
                            { num: 3, label: 'Valores' },
                            { num: 4, label: 'Filtros y Vista' },
                        ].map((step) => (
                            <button
                                key={step.num}
                                onClick={() => setCurrentStep(step.num)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${currentStep === step.num
                                    ? 'bg-primary text-white'
                                    : currentStep > step.num
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-secondary/50 text-muted-foreground'
                                    }`}
                            >
                                <span className="font-bold mr-1">{step.num}.</span>
                                {step.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Step 1: Chart Type */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">¿Qué tipo de gráfico quieres crear?</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {CHART_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setChartType(type.id)}
                                        className={`p-6 rounded-xl border-2 transition-all text-left ${chartType === type.id
                                            ? 'border-primary bg-primary/10'
                                            : 'border-border hover:border-primary/50'
                                            }`}
                                    >
                                        <div className="text-4xl mb-3">{type.icon}</div>
                                        <div className="font-semibold text-lg">{type.label}</div>
                                        <div className="text-sm text-muted-foreground">{type.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Product Selection */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            {/* Column selector for product names */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-muted-foreground">
                                    ¿Qué columna contiene los nombres de los productos?
                                </label>
                                <select
                                    value={productLabelColumn}
                                    onChange={(e) => setProductLabelColumn(e.target.value)}
                                    className="input max-w-md"
                                >
                                    {columns.map(col => (
                                        <option key={col.id} value={col.name}>{col.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium">¿Qué productos quieres comparar?</h3>
                                <span className="text-sm text-muted-foreground">
                                    {selectedProducts.size} de {workingData.length} seleccionados
                                </span>
                            </div>

                            {/* Search and Select All */}
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Buscar productos..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="input w-full pl-10"
                                    />
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <button
                                    onClick={() => setSelectedProducts(new Set(filteredProducts.map(row => workingData.indexOf(row))))}
                                    className="btn btn-outline whitespace-nowrap"
                                >
                                    Seleccionar Todo
                                </button>
                                <button
                                    onClick={() => setSelectedProducts(new Set())}
                                    className="btn btn-outline whitespace-nowrap text-red-400 border-red-400/50 hover:bg-red-400/10"
                                >
                                    Deseleccionar Todo
                                </button>
                            </div>

                            {/* Product List */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-1">
                                {filteredProducts.map((row, idx) => {
                                    const realIdx = workingData.indexOf(row);
                                    const isSelected = selectedProducts.has(realIdx);
                                    return (
                                        <button
                                            key={realIdx}
                                            onClick={() => toggleProduct(realIdx)}
                                            className={`p-3 rounded-lg border text-left transition-all ${isSelected
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-primary/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-border'
                                                    }`}>
                                                    {isSelected && (
                                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="text-sm truncate">{String(row[productLabelColumn] || `Producto ${realIdx + 1}`)}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Value Columns */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium mb-3">¿Qué columna usar como etiqueta?</h3>
                                <select
                                    value={labelColumn}
                                    onChange={(e) => setLabelColumn(e.target.value)}
                                    className="input w-full max-w-md"
                                >
                                    {columns.map(col => (
                                        <option key={col.id} value={col.name}>{col.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium mb-3">¿Qué valores quieres comparar?</h3>
                                <p className="text-sm text-muted-foreground mb-4">Selecciona una o más columnas numéricas</p>

                                <div className="flex flex-wrap gap-3">
                                    {numberColumns.map((col, idx) => (
                                        <button
                                            key={col.id}
                                            onClick={() => toggleValueColumn(col.name)}
                                            className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${valueColumns.includes(col.name)
                                                ? 'text-white border-transparent'
                                                : 'border-border hover:border-primary/50'
                                                }`}
                                            style={valueColumns.includes(col.name) ? { backgroundColor: COLORS[idx % COLORS.length] } : {}}
                                        >
                                            {col.name}
                                        </button>
                                    ))}
                                </div>

                                {numberColumns.length === 0 && (
                                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                                        ⚠️ No hay columnas numéricas. Cambia el tipo de columna en la tabla haciendo clic derecho en el encabezado.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Filters and Preview */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            {/* Filters Row */}
                            <div className="flex flex-wrap gap-4">
                                {availableClients.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Cliente/Proveedor</label>
                                        <select
                                            value={filterClient}
                                            onChange={(e) => setFilterClient(e.target.value)}
                                            className="input min-w-[200px]"
                                        >
                                            <option value="">Todos</option>
                                            {availableClients.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {months.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Mes</label>
                                        <select
                                            value={filterMonth}
                                            onChange={(e) => setFilterMonth(e.target.value)}
                                            className="input min-w-[200px]"
                                        >
                                            <option value="">Todos</option>
                                            {months.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Chart Theme Toggle + Preview */}
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Vista previa del gráfico</span>
                                <button
                                    onClick={() => setChartTheme(prev => prev === 'light' ? 'dark' : 'light')}
                                    className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
                                    title={chartTheme === 'light' ? 'Cambiar a fondo oscuro' : 'Cambiar a fondo claro'}
                                >
                                    {chartTheme === 'light' ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {/* Chart Preview */}
                            <div
                                ref={chartRef}
                                className={`rounded-xl p-4 min-h-[350px] ${chartTheme === 'light' ? 'bg-white' : 'bg-gray-900'}`}
                            >
                                {chartData.length === 0 || valueColumns.length === 0 ? (
                                    <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                                        {selectedProducts.size === 0
                                            ? 'Selecciona productos en el paso 2'
                                            : valueColumns.length === 0
                                                ? 'Selecciona valores en el paso 3'
                                                : 'No hay datos para mostrar'}
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={350}>
                                        {chartType === 'bar' ? (
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme === 'light' ? '#e5e7eb' : '#374151'} />
                                                <XAxis dataKey="name" stroke={chartTheme === 'light' ? '#111827' : '#f9fafb'} fontSize={12} tick={false} />
                                                <YAxis stroke={chartTheme === 'light' ? '#111827' : '#f9fafb'} fontSize={12} tick={{ fill: chartTheme === 'light' ? '#111827' : '#f9fafb' }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: chartTheme === 'light' ? '#ffffff' : '#1f2937',
                                                        border: '2px solid #000000',
                                                        borderRadius: '8px',
                                                        color: chartTheme === 'light' ? '#111827' : '#f9fafb',
                                                    }}
                                                    labelStyle={{ color: chartTheme === 'light' ? '#111827' : '#f9fafb', fontWeight: 'bold', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}
                                                    itemStyle={{ color: chartTheme === 'light' ? '#111827' : '#f9fafb' }}
                                                />
                                                <Legend />
                                                {valueColumns.map((col, idx) => (
                                                    <Bar
                                                        key={col}
                                                        dataKey={col}
                                                        fill={COLORS[idx % COLORS.length]}
                                                        radius={[4, 4, 0, 0]}
                                                    />
                                                ))}
                                            </BarChart>
                                        ) : chartType === 'line' ? (
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme === 'light' ? '#e5e7eb' : '#374151'} />
                                                <XAxis dataKey="name" stroke={chartTheme === 'light' ? '#111827' : '#f9fafb'} fontSize={12} tick={false} />
                                                <YAxis stroke={chartTheme === 'light' ? '#111827' : '#f9fafb'} fontSize={12} tick={{ fill: chartTheme === 'light' ? '#111827' : '#f9fafb' }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: chartTheme === 'light' ? '#ffffff' : '#1f2937',
                                                        border: '2px solid #000000',
                                                        borderRadius: '8px',
                                                        color: chartTheme === 'light' ? '#111827' : '#f9fafb',
                                                    }}
                                                    labelStyle={{ color: chartTheme === 'light' ? '#111827' : '#f9fafb', fontWeight: 'bold', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}
                                                    itemStyle={{ color: chartTheme === 'light' ? '#111827' : '#f9fafb' }}
                                                />
                                                <Legend />
                                                {valueColumns.map((col, idx) => (
                                                    <Line
                                                        key={col}
                                                        type="monotone"
                                                        dataKey={col}
                                                        stroke={COLORS[idx % COLORS.length]}
                                                        strokeWidth={2}
                                                        dot={{ fill: COLORS[idx % COLORS.length] }}
                                                    />
                                                ))}
                                            </LineChart>
                                        ) : (
                                            <PieChart>
                                                <Pie
                                                    data={chartData}
                                                    dataKey={valueColumns[0]}
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={130}
                                                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                                                >
                                                    {chartData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: chartTheme === 'light' ? '#ffffff' : '#1f2937',
                                                        border: '2px solid #000000',
                                                        borderRadius: '8px',
                                                        color: chartTheme === 'light' ? '#111827' : '#f9fafb',
                                                    }}
                                                    labelStyle={{ color: chartTheme === 'light' ? '#111827' : '#f9fafb', fontWeight: 'bold', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}
                                                    itemStyle={{ color: chartTheme === 'light' ? '#111827' : '#f9fafb' }}
                                                />
                                                <Legend />
                                            </PieChart>
                                        )}
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Info */}
                            <p className="text-sm text-muted-foreground text-center">
                                Mostrando {chartData.length} de {selectedProducts.size} productos seleccionados
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer with Navigation */}
                <div className="flex items-center justify-between p-4 border-t border-border">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className="btn btn-outline"
                    >
                        ← Anterior
                    </button>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="btn btn-outline">
                            Cerrar
                        </button>

                        {currentStep === 4 ? (
                            <button
                                onClick={downloadChart}
                                disabled={valueColumns.length === 0 || chartData.length === 0}
                                className="btn btn-primary"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Descargar PNG
                            </button>
                        ) : (
                            <button onClick={nextStep} className="btn btn-primary">
                                Siguiente →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
