import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combine class names with Tailwind merge
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Generate random ID
export function generateId(): string {
    return crypto.randomUUID();
}

// Format date for display
export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(date));
}

// Format currency
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
    }).format(amount);
}

// Calculate stock status based on thresholds
export function getStockStatus(
    stockActual: number,
    stockMinimo: number,
    stockMaximo: number
): 'bajo' | 'correcto' | 'alto' {
    if (stockActual < stockMinimo) return 'bajo';
    if (stockActual >= stockMaximo) return 'alto';
    return 'correcto';
}

// Get status color class
export function getStatusColor(status: 'bajo' | 'correcto' | 'alto'): string {
    switch (status) {
        case 'bajo':
            return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'correcto':
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'alto':
            return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
}

// Get job status color
export function getJobStatusColor(status: string): string {
    switch (status) {
        case 'pending':
            return 'bg-blue-500/20 text-blue-400';
        case 'running':
            return 'bg-purple-500/20 text-purple-400';
        case 'completed':
            return 'bg-green-500/20 text-green-400';
        case 'failed':
            return 'bg-red-500/20 text-red-400';
        default:
            return 'bg-gray-500/20 text-gray-400';
    }
}
