'use client';

import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';

interface KPIData {
    nombre?: string;
    'Stock Actual'?: number;
    stock_actual?: number;
    Stock?: number;
    'Stock Mínimo'?: number;
    stock_minimo?: number;
    'Stock Máximo'?: number;
    stock_maximo?: number;
    'Coste Unit.'?: number;
    coste_unitario?: number;
    Coste?: number;
    Precio?: number;
    [key: string]: unknown;
}

interface KPICardsProps {
    data: KPIData[];
    stockMinimo?: number;
    stockMaximo?: number;
}

export default function KPICards({ data, stockMinimo = 10, stockMaximo = 100 }: KPICardsProps) {
    const kpis = useMemo(() => {
        if (!data || data.length === 0) {
            return {
                totalProducts: 0,
                totalStock: 0,
                inventoryValue: 0,
                criticalProducts: 0,
                healthyProducts: 0,
                excessProducts: 0,
                avgDaysOfStock: 0,
            };
        }

        let totalStock = 0;
        let inventoryValue = 0;
        let criticalProducts = 0;
        let healthyProducts = 0;
        let excessProducts = 0;

        data.forEach((item) => {
            const stock = Number(item['Stock Actual'] || item.stock_actual || item.Stock || 0);
            const cost = Number(item['Coste Unit.'] || item.coste_unitario || item.Coste || item.Precio || 0);
            const minStock = Number(item['Stock Mínimo'] || item.stock_minimo || stockMinimo);
            const maxStock = Number(item['Stock Máximo'] || item.stock_maximo || stockMaximo);

            totalStock += stock;
            inventoryValue += stock * cost;

            if (stock < minStock) {
                criticalProducts++;
            } else if (stock > maxStock) {
                excessProducts++;
            } else {
                healthyProducts++;
            }
        });

        // Estimate average days of stock (assuming 10 units/day consumption on average)
        const avgDailyConsumption = 10;
        const avgDaysOfStock = totalStock > 0 ? Math.round(totalStock / data.length / avgDailyConsumption) : 0;

        return {
            totalProducts: data.length,
            totalStock,
            inventoryValue,
            criticalProducts,
            healthyProducts,
            excessProducts,
            avgDaysOfStock,
        };
    }, [data, stockMinimo, stockMaximo]);

    const cards = [
        {
            title: 'Valor del Inventario',
            value: formatCurrency(kpis.inventoryValue),
            icon: '💰',
            color: 'text-primary',
            bgColor: 'bg-primary/10',
        },
        {
            title: 'Total Productos',
            value: kpis.totalProducts.toString(),
            icon: '📦',
            color: 'text-blue-400',
            bgColor: 'bg-blue-400/10',
        },
        {
            title: 'Stock Total',
            value: kpis.totalStock.toLocaleString(),
            icon: '📊',
            color: 'text-purple-400',
            bgColor: 'bg-purple-400/10',
        },
        {
            title: 'Productos Críticos',
            value: kpis.criticalProducts.toString(),
            icon: '⚠️',
            color: 'text-red-400',
            bgColor: 'bg-red-400/10',
            highlight: kpis.criticalProducts > 0,
        },
        {
            title: 'Stock Saludable',
            value: kpis.healthyProducts.toString(),
            icon: '✅',
            color: 'text-green-400',
            bgColor: 'bg-green-400/10',
        },
        {
            title: 'Días de Stock Est.',
            value: `~${kpis.avgDaysOfStock} días`,
            icon: '📅',
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-400/10',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`card p-4 ${card.highlight ? 'border-red-500/50 animate-pulse' : ''}`}
                >
                    <div className="flex items-start justify-between mb-2">
                        <span className="text-2xl">{card.icon}</span>
                        <div className={`px-2 py-1 rounded-full text-xs ${card.bgColor} ${card.color}`}>
                            KPI
                        </div>
                    </div>
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
                </div>
            ))}
        </div>
    );
}
