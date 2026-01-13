'use client';

import { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar, PolarArea } from 'react-chartjs-2';
import { ChartConfig } from '@/types';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Default color palette
const DEFAULT_COLORS = [
    'rgba(99, 102, 241, 0.8)',   // Primary (indigo)
    'rgba(139, 92, 246, 0.8)',   // Purple
    'rgba(168, 85, 247, 0.8)',   // Violet
    'rgba(236, 72, 153, 0.8)',   // Pink
    'rgba(34, 197, 94, 0.8)',    // Green
    'rgba(234, 179, 8, 0.8)',    // Yellow
    'rgba(239, 68, 68, 0.8)',    // Red
    'rgba(14, 165, 233, 0.8)',   // Sky
];

const DEFAULT_BORDER_COLORS = [
    'rgba(99, 102, 241, 1)',
    'rgba(139, 92, 246, 1)',
    'rgba(168, 85, 247, 1)',
    'rgba(236, 72, 153, 1)',
    'rgba(34, 197, 94, 1)',
    'rgba(234, 179, 8, 1)',
    'rgba(239, 68, 68, 1)',
    'rgba(14, 165, 233, 1)',
];

interface ChartRendererProps {
    config: ChartConfig;
    className?: string;
}

export default function ChartRenderer({ config, className = '' }: ChartRendererProps) {
    // Prepare chart data with default colors if not provided
    const chartData = useMemo(() => {
        const datasets = config.datasets.map((dataset, index) => {
            const isPieType = ['pie', 'doughnut', 'polarArea'].includes(config.type);

            return {
                ...dataset,
                backgroundColor: dataset.backgroundColor || (isPieType
                    ? DEFAULT_COLORS.slice(0, config.labels.length)
                    : DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                ),
                borderColor: dataset.borderColor || (isPieType
                    ? DEFAULT_BORDER_COLORS.slice(0, config.labels.length)
                    : DEFAULT_BORDER_COLORS[index % DEFAULT_BORDER_COLORS.length]
                ),
                borderWidth: dataset.borderWidth ?? 2,
            };
        });

        return {
            labels: config.labels,
            datasets,
        };
    }, [config]);

    // Chart options
    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: '#fafafa',
                    font: {
                        family: 'system-ui, sans-serif',
                    },
                },
            },
            title: {
                display: true,
                text: config.title,
                color: '#fafafa',
                font: {
                    size: 16,
                    weight: 'bold' as const,
                    family: 'system-ui, sans-serif',
                },
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 26, 0.95)',
                titleColor: '#fafafa',
                bodyColor: '#a1a1aa',
                borderColor: 'rgba(99, 102, 241, 0.5)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
            },
        },
        scales: ['bar', 'line', 'radar'].includes(config.type) ? {
            x: {
                ticks: { color: '#a1a1aa' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
            },
            y: {
                ticks: { color: '#a1a1aa' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
            },
        } : undefined,
    }), [config.title, config.type]);

    // Render appropriate chart type
    const renderChart = () => {
        switch (config.type) {
            case 'bar':
                return <Bar data={chartData} options={options} />;
            case 'line':
                return <Line data={chartData} options={options} />;
            case 'pie':
                return <Pie data={chartData} options={options} />;
            case 'doughnut':
                return <Doughnut data={chartData} options={options} />;
            case 'radar':
                return <Radar data={chartData} options={options} />;
            case 'polarArea':
                return <PolarArea data={chartData} options={options} />;
            default:
                return <Bar data={chartData} options={options} />;
        }
    };

    return (
        <div className={`bg-card/50 rounded-lg p-4 ${className}`}>
            {renderChart()}
            {config.description && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                    {config.description}
                </p>
            )}
        </div>
    );
}
