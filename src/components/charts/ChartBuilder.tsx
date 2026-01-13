import { useState } from 'react';
import { Column } from '@/components/inventory/EditableSpreadsheet';

interface ChartBuilderProps {
    columns: Column[];
    onGenerate: (prompt: string) => void;
    disabled?: boolean;
}

export default function ChartBuilder({ columns, onGenerate, disabled }: ChartBuilderProps) {
    const [chartType, setChartType] = useState('bar');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
    const [labelColumn, setLabelColumn] = useState('');
    const [limit, setLimit] = useState('10');
    const [filter, setFilter] = useState('all');

    // Identify potential metric columns (numbers) and label columns (text)
    const metricColumns = columns.filter(c => c.type === 'number');
    const labelColumns = columns.filter(c => c.type === 'text');

    const handleMetricToggle = (colId: string) => {
        setSelectedMetrics(prev =>
            prev.includes(colId)
                ? prev.filter(id => id !== colId)
                : [...prev, colId]
        );
    };

    const handleGenerate = () => {
        if (selectedMetrics.length === 0) return;

        // Construct a detailed prompt for the AI based on parameters
        const metricNames = columns
            .filter(c => selectedMetrics.includes(c.id))
            .map(c => c.name)
            .join(', ');

        const labelName = columns.find(c => c.id === labelColumn)?.name || 'Producto';

        let prompt = `Genera un gráfico de tipo '${chartType}' que muestre: ${metricNames}. `;
        prompt += `Usa '${labelName}' como etiquetas para el eje X. `;

        if (filter === 'low_stock') {
            prompt += `Filtra mostrando solo los productos con stock bajo (menor al mínimo). `;
        } else if (filter === 'high_stock') {
            prompt += `Filtra mostrando solo los productos con exceso de stock (mayor al máximo). `;
        }

        if (limit === 'selection') {
            prompt += `analizando ÚNICAMENTE los elementos seleccionados manualmente por el usuario. `;
        } else if (limit !== 'all') {
            prompt += `Limita la visualización a los ${limit} resultados más relevantes/importantes.`;
        } else {
            prompt += `Muestra todos los datos disponibles.`;
        }

        onGenerate(prompt);
    };

    return (
        <div className="bg-card/50 rounded-lg p-4 border border-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Chart Type */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Tipo de Gráfico</label>
                    <select
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value)}
                        className="input w-full bg-background"
                    >
                        <option value="bar">📊 Barras (Comparación)</option>
                        <option value="line">📈 Línea (Tendencia)</option>
                        <option value="pie">🥧 Circular (Distribución)</option>
                        <option value="doughnut">🍩 Donut (Proporción)</option>
                        <option value="radar">🕸️ Radar (Métricas múltiples)</option>
                        <option value="polarArea">❄️ Área Polar</option>
                    </select>
                </div>

                {/* Main Label Column */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Etiquetas (Eje X)</label>
                    <select
                        value={labelColumn}
                        onChange={(e) => setLabelColumn(e.target.value)}
                        className="input w-full bg-background"
                    >
                        <option value="">Seleccionar columna...</option>
                        {labelColumns.map(col => (
                            <option key={col.id} value={col.id}>{col.name}</option>
                        ))}
                    </select>
                </div>


                {/* Data Limit */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Cantidad de Datos</label>
                    <select
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        className="input w-full bg-background"
                    >
                        <option value="selection">✅ Solo Seleccionados</option>
                        <option value="5">Top 5</option>
                        <option value="10">Top 10</option>
                        <option value="20">Top 20</option>
                        <option value="all">Todos</option>
                    </select>
                </div>

                {/* Pre-filters */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Filtro Rápido</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="input w-full bg-background"
                    >
                        <option value="all">Sin filtro</option>
                        <option value="low_stock">⚠️ Solo Stock Bajo</option>
                        <option value="high_stock">📦 Solo Exceso Stock</option>
                    </select>
                </div>
            </div>

            {/* Metrics Selection */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Datos a comparar (Selecciona al menos 1)</label>
                <div className="flex flex-wrap gap-2">
                    {metricColumns.length > 0 ? (
                        metricColumns.map(col => (
                            <button
                                key={col.id}
                                onClick={() => handleMetricToggle(col.id)}
                                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${selectedMetrics.includes(col.id)
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background hover:bg-secondary border-border text-muted-foreground'
                                    }`}
                            >
                                {col.name}
                                {selectedMetrics.includes(col.id) && ' ✓'}
                            </button>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground italic">No hay columnas numéricas disponibles</span>
                    )}
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={disabled || selectedMetrics.length === 0}
                className="w-full btn btn-primary mt-2"
            >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Generar Gráfico Personalizado
            </button>
        </div>
    );
}
