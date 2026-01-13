'use client';

import { useState, useEffect, useRef } from 'react';

interface BarcodeScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (code: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const scannerRef = useRef<HTMLDivElement>(null);
    const html5QrCodeRef = useRef<unknown>(null);

    useEffect(() => {
        if (isOpen && scannerRef.current) {
            startScanner();
        }

        return () => {
            stopScanner();
        };
    }, [isOpen]);

    const startScanner = async () => {
        try {
            setError(null);
            setIsScanning(true);

            // Dynamic import to avoid SSR issues
            const { Html5Qrcode } = await import('html5-qrcode');

            if (!scannerRef.current) return;

            // Ensure previous instance is stopped
            if (html5QrCodeRef.current) {
                await stopScanner();
            }

            const scanner = new Html5Qrcode('barcode-reader');
            html5QrCodeRef.current = scanner;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                aspectRatio: 1.7777778,
            };

            const successCallback = (decodedText: string) => {
                setLastScanned(decodedText);
                onScan(decodedText);
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
            };

            try {
                // First attempt: preferred camera (environment/back)
                await scanner.start(
                    { facingMode: 'environment' },
                    config,
                    successCallback,
                    () => { }
                );
            } catch (err) {
                console.warn('Environment camera failed, trying default...', err);
                try {
                    // Second attempt: any camera
                    await scanner.start(
                        { facingMode: 'user' },
                        config,
                        successCallback,
                        () => { }
                    );
                } catch (retryErr) {
                    // Final attempt: no constraints (let browser choose)
                    console.warn('Specific camera failed, trying without constraints...', retryErr);
                    await scanner.start(
                        {}, // Empty constraints = default camera
                        config,
                        successCallback,
                        () => { }
                    );
                }
            }
        } catch (err) {
            console.error('Scanner error:', err);
            let msg = 'No se pudo acceder a la cámara.';
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError') msg = 'Permiso de cámara denegado.';
                if (err.name === 'NotFoundError') msg = 'No se encontró ninguna cámara.';
                if (err.name === 'NotReadableError') msg = 'La cámara está en uso por otra app.';
            }
            setError(msg);
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                await (html5QrCodeRef.current as { stop: () => Promise<void> }).stop();
            } catch {
                // Ignore stop errors
            }
            html5QrCodeRef.current = null;
        }
        setIsScanning(false);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            onScan(manualCode.trim());
            setLastScanned(manualCode.trim());
            setManualCode('');
        }
    };

    const handleClose = () => {
        stopScanner();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📷</span>
                        <div>
                            <h2 className="text-xl font-semibold">Escanear Código</h2>
                            <p className="text-sm text-muted-foreground">
                                Apunta a un código de barras
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scanner Area */}
                <div className="p-4">
                    {error ? (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-center">
                            <p className="mb-2">{error}</p>
                            <button
                                onClick={startScanner}
                                className="btn btn-outline text-sm"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <div
                                id="barcode-reader"
                                ref={scannerRef}
                                className="w-full rounded-lg overflow-hidden bg-black"
                                style={{ minHeight: '250px' }}
                            />

                            {isScanning && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-64 h-32 border-2 border-primary rounded-lg animate-pulse" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Last Scanned */}
                    {lastScanned && (
                        <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                            <p className="text-sm text-green-400 flex items-center gap-2">
                                <span>✅</span>
                                <span>Último escaneado:</span>
                                <code className="px-2 py-0.5 rounded bg-secondary font-mono">
                                    {lastScanned}
                                </code>
                            </p>
                        </div>
                    )}

                    {/* Manual Entry */}
                    <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground mb-2">
                            O introduce el código manualmente:
                        </p>
                        <form onSubmit={handleManualSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="Código de barras..."
                                className="input flex-1"
                            />
                            <button type="submit" className="btn btn-primary">
                                Buscar
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-secondary/30">
                    <p className="text-xs text-muted-foreground text-center">
                        💡 Asegúrate de que el producto tenga un código de barras visible
                    </p>
                </div>
            </div>
        </div>
    );
}
