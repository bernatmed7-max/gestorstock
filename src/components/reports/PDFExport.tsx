'use client';

import { useCallback } from 'react';

interface PDFExportData {
    nombre?: string;
    Producto?: string;
    'Stock Actual'?: number;
    stock_actual?: number;
    Stock?: number;
    'Stock Mínimo'?: number;
    stock_minimo?: number;
    'Coste Unit.'?: number;
    coste_unitario?: number;
    Coste?: number;
    [key: string]: unknown;
}

interface PDFExportProps {
    data: PDFExportData[];
    columns: { id: string; name: string; type: string }[];
    sheetName?: string;
    stockMinimo?: number;
}

export default function PDFExport({ data, columns, sheetName = 'Inventario', stockMinimo = 10 }: PDFExportProps) {
    const generatePDF = useCallback(async () => {
        // Dynamic import to avoid SSR issues
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Title
        doc.setFontSize(20);
        doc.setTextColor(255, 199, 0); // Gold color
        doc.text('📊 Informe de Inventario', pageWidth / 2, 20, { align: 'center' });

        // Subtitle with date
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`, pageWidth / 2, 28, { align: 'center' });

        doc.text(`Hoja: ${sheetName}`, pageWidth / 2, 34, { align: 'center' });

        // Calculate KPIs
        let totalStock = 0;
        let inventoryValue = 0;
        let criticalCount = 0;

        data.forEach((item) => {
            const stock = Number(item['Stock Actual'] || item.stock_actual || item.Stock || 0);
            const cost = Number(item['Coste Unit.'] || item.coste_unitario || item.Coste || 0);
            const minStock = Number(item['Stock Mínimo'] || item.stock_minimo || stockMinimo);

            totalStock += stock;
            inventoryValue += stock * cost;
            if (stock < minStock) criticalCount++;
        });

        // KPI Summary Box
        doc.setFillColor(26, 26, 26);
        doc.roundedRect(14, 42, pageWidth - 28, 30, 3, 3, 'F');

        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);

        const kpiY = 55;
        const kpiSpacing = (pageWidth - 28) / 4;

        // KPI 1: Total Products
        doc.text('Total Productos', 20, kpiY - 5);
        doc.setFontSize(14);
        doc.setTextColor(255, 199, 0);
        doc.text(data.length.toString(), 20, kpiY + 5);

        // KPI 2: Total Stock
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('Stock Total', 20 + kpiSpacing, kpiY - 5);
        doc.setFontSize(14);
        doc.setTextColor(100, 200, 255);
        doc.text(totalStock.toLocaleString(), 20 + kpiSpacing, kpiY + 5);

        // KPI 3: Inventory Value
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('Valor Inventario', 20 + kpiSpacing * 2, kpiY - 5);
        doc.setFontSize(14);
        doc.setTextColor(100, 255, 150);
        doc.text(`${inventoryValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 20 + kpiSpacing * 2, kpiY + 5);

        // KPI 4: Critical Products
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('Críticos', 20 + kpiSpacing * 3, kpiY - 5);
        doc.setFontSize(14);
        doc.setTextColor(criticalCount > 0 ? 255 : 100, criticalCount > 0 ? 100 : 255, 100);
        doc.text(criticalCount.toString(), 20 + kpiSpacing * 3, kpiY + 5);

        // Prepare table data
        const tableColumns = columns.map(col => col.name);
        const tableRows = data.map(item =>
            columns.map(col => {
                const value = item[col.name];
                if (col.type === 'number' && typeof value === 'number') {
                    return value.toLocaleString('es-ES');
                }
                return String(value ?? '-');
            })
        );

        // Add table
        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 80,
            styles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: [255, 255, 255],
                fillColor: [26, 26, 26],
            },
            headStyles: {
                fillColor: [255, 199, 0],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [40, 40, 40],
            },
            margin: { left: 14, right: 14 },
        });

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(
                `Página ${i} de ${pageCount} | Gestor de Stock`,
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        // Download
        doc.save(`inventario-${sheetName}-${new Date().toISOString().split('T')[0]}.pdf`);
    }, [data, columns, sheetName, stockMinimo]);

    return (
        <button
            onClick={generatePDF}
            disabled={data.length === 0}
            className="btn bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            title="Exportar informe PDF"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
        </button>
    );
}
