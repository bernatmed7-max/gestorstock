import * as XLSX from 'xlsx';
import { DynamicSheet, Column, Row } from '@/components/inventory/EditableSpreadsheet';
import { generateId } from '@/lib/utils';

export async function parseExcelFile(file: File): Promise<DynamicSheet[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                const sheets: DynamicSheet[] = [];

                workbook.SheetNames.forEach((sheetName) => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData.length === 0) return;

                    // Extract headers (first row)
                    const headers = (jsonData[0] as string[]) || [];

                    // Create columns

                    // Extract data rows first (skipping header)
                    const rawRows = (jsonData.slice(1) as unknown[][]) || [];

                    // Auto-detect column types based on first 10 rows
                    const columns: Column[] = headers.map((header, colIndex) => {
                        let isNumber = true;
                        let hasContent = false;

                        // Check up to 10 rows
                        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                            const val = rawRows[i][colIndex];
                            if (val !== undefined && val !== null && val !== '') {
                                hasContent = true;
                                if (isNaN(Number(val))) {
                                    isNumber = false;
                                    break;
                                }
                            }
                        }

                        // Default to text if empty, but if it has content and all are numbers, it's a number
                        return {
                            id: `col-${generateId()}`,
                            name: header || 'Sin título',
                            type: (hasContent && isNumber) ? 'number' : 'text'
                        };
                    });

                    // Map of column index to column ID for easy row creation
                    const colIndexToId: Record<number, string> = {};
                    columns.forEach((col, idx) => {
                        colIndexToId[idx] = col.id;
                    });

                    // Create rows
                    const rows: Row[] = rawRows.map((rowArray) => {
                        const cells: Record<string, string | number | null> = {};

                        columns.forEach((col, idx) => {
                            const value = rowArray[idx];
                            // If column is number, ensure we store number type
                            if (col.type === 'number' && value !== null && value !== undefined) {
                                cells[col.id] = Number(value);
                            } else if (value !== undefined && value !== null) {
                                cells[col.id] = typeof value === 'string' || typeof value === 'number' ? value : String(value);
                            } else {
                                cells[col.id] = null;
                            }
                        });

                        return {
                            id: `row-${generateId()}`,
                            cells
                        };
                    });

                    sheets.push({
                        id: `sheet-${generateId()}`,
                        name: sheetName,
                        columns,
                        rows
                    });
                });

                resolve(sheets);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);

        reader.readAsArrayBuffer(file);
    });
}
