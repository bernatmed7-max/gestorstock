'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client } from '@/types';
import { Toaster, toast } from 'sonner';

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<Partial<Client>>({});
    const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);

    const supabase = createClient();

    // Load clients
    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // Determine if error is "Relation does not exist" (table missing)
                if (error.code === '42P01') {
                    console.warn('Table clients does not exist. Using local demo mode.');
                    // Load from localStorage if available
                    const localClients = localStorage.getItem('demo_clients');
                    if (localClients) {
                        setClients(JSON.parse(localClients));
                    }
                } else {
                    console.error('Error loading clients:', error);
                    toast.error('Error al cargar clientes');
                }
            } else {
                setClients(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClient = async () => {
        if (!formData.nombre) {
            toast.error('El nombre es obligatorio');
            return;
        }

        try {
            const newClient = {
                id: formData.id || crypto.randomUUID(),
                nombre: formData.nombre,
                email: formData.email,
                telefono: formData.telefono,
                direccion: formData.direccion,
                cif_nif: formData.cif_nif,
                notas: formData.notas,
                created_at: formData.created_at || new Date().toISOString(),
                // If it's an edit, we keep existing fields, but we ensure ID is set.
            };

            // Try Supabase first
            const { error } = await supabase
                .from('clients')
                .upsert(newClient);

            if (error) {
                if (error.code === '42P01' || error.message.includes('relation "clients" does not exist')) {
                    // Fallback to local
                    const updatedClients = formData.id
                        ? clients.map(c => c.id === formData.id ? { ...c, ...newClient } as Client : c)
                        : [newClient as Client, ...clients];

                    setClients(updatedClients);
                    localStorage.setItem('demo_clients', JSON.stringify(updatedClients));
                    toast.success('Cliente guardado (Modo Demo Local)');
                } else {
                    throw error;
                }
            } else {
                toast.success('Cliente guardado correctamente');
                loadClients();
            }

            setShowForm(false);
            setFormData({});
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar cliente');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

        try {
            const { error } = await supabase.from('clients').delete().eq('id', id);

            if (error) {
                if (error.code === '42P01' || error.message.includes('relation "clients" does not exist')) {
                    const updated = clients.filter(c => c.id !== id);
                    setClients(updated);
                    localStorage.setItem('demo_clients', JSON.stringify(updated));
                    toast.success('Cliente eliminado (Local)');
                } else {
                    throw error;
                }
            } else {
                toast.success('Cliente eliminado');
                loadClients();
            }
        } catch (err) {
            toast.error('Error al eliminar');
        }
    };

    const handleGenerateInvoice = async (client: Client) => {
        setGeneratingInvoice(client.id);

        try {
            // 1. Fetch current inventory
            // We'll try to get it from the sync table (shared state)
            const { data: syncData, error } = await supabase
                .from('sheet_sync')
                .select('rows') // Assuming rows is the JSON blob
                .single();

            let inventory: Record<string, unknown>[] = [];

            if (!error && syncData?.rows) {
                inventory = syncData.rows;
            } else {
                // Try localStorage fallback from the EditableSpreadsheet
                // This is hacky but we don't have a shared context easily available without refactoring layout
                // We'll prompt the user if no data found
                toast.info('Buscando datos de inventario...');
                // Attempt to read from a known local storage key if we implemented one, or just warn
            }

            // NOTE: Since the spreadsheet state is only in DashboardPage, we might not have access to it here easily if not verified in DB.
            // As a workaround for this "Task", if we don't find DB data, we will simulate or ask user to provide data.
            // However, a better approach is to assume the user has loaded data in the Dashboard which syncs to 'sheet_sync' table ideally.
            // If the user hasn't synced, we might need a context. For now, let's rely on sheet_sync or warn.

            if (inventory.length === 0) {
                // Try to grab from window if available (very hacky) or just fail gracefully
                toast.error('No se encontraron datos de inventario sincronizados. Ve al Dashboard e importa/guarda datos primero.');
                return;
            }

            // 2. Filter products provided by this client
            // We look for a column "Proveedor" or "Vendor" or verify matches
            const clientName = client.nombre.toLowerCase();
            const clientProducts = inventory.filter((row: Record<string, unknown>) => {
                const proveedor = String(
                    row['Proveedor'] ||
                    row['proveedor'] ||
                    row['Vendor'] ||
                    row['Supplier'] ||
                    ''
                ).toLowerCase();
                return proveedor.includes(clientName);
            });

            if (clientProducts.length === 0) {
                toast.warning(`No se encontraron productos para "${client.nombre}". Asegúrate de tener una columna "Proveedor" en tu tabla.`);
                return;
            }

            // 3. Generate Simple "Invoice" (Browser Print View for now)
            const total = clientProducts.reduce((sum: number, p: Record<string, unknown>) => {
                const cost = Number(p['Coste Unit.'] || p['Coste'] || p['Precio'] || 0);
                const stock = Number(p['Stock Actual'] || p['stock'] || 1);
                return sum + (cost * stock);
            }, 0);

            const invoiceWindow = window.open('', '_blank');
            if (invoiceWindow) {
                invoiceWindow.document.write(`
                    <html>
                    <head>
                        <title>Factura - ${client.nombre}</title>
                        <style>
                            body { font-family: sans-serif; padding: 40px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                            .total { margin-top: 20px; text-align: right; font-size: 1.2em; font-weight: bold; }
                            .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #666; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div>
                                <h1>Factura / Nota de Entrega</h1>
                                <p><strong>Proveedor:</strong> ${client.nombre}</p>
                                <p><strong>NIF/CIF:</strong> ${client.cif_nif || '-'}</p>
                                <p><strong>Email:</strong> ${client.email || '-'}</p>
                                <p><strong>Dirección:</strong> ${client.direccion || '-'}</p>
                            </div>
                            <div style="text-align: right;">
                                <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
                                <p><strong>ID Factura:</strong> ${crypto.randomUUID().slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>

                        <h2>Resumen de Productos Provistos</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Stock Entregado</th>
                                    <th>Coste Unit.</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${clientProducts.map((p: Record<string, unknown>) => `
                                    <tr>
                                        <td>${p['Nombre'] || p['Producto'] || 'Item sin nombre'}</td>
                                        <td>${p['Stock Actual'] || p['stock'] || 1}</td>
                                        <td>${Number(p['Coste Unit.'] || p['Coste'] || p['Precio'] || 0).toFixed(2)} €</td>
                                        <td>${(Number(p['Coste Unit.'] || p['Coste'] || p['Precio'] || 0) * Number(p['Stock Actual'] || p['stock'] || 1)).toFixed(2)} €</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="total">
                            Total Estimado: ${total.toFixed(2)} €
                        </div>

                        <div class="footer">
                            <p>Documento generado automáticamente por Gestor de Stock</p>
                        </div>

                        <script>
                            window.print();
                        </script>
                    </body>
                    </html>
                `);
                invoiceWindow.document.close();
            }

        } catch (err) {
            console.error(err);
            toast.error('Error generando factura');
        } finally {
            setGeneratingInvoice(null);
        }
    };

    return (
        <div className="space-y-8">
            <Toaster position="top-right" />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Gestión de Clientes y Proveedores</h1>
                    <p className="text-muted-foreground mt-2">Administra tus contactos y genera facturas de sus productos</p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setFormData({}); }}
                    className="btn btn-primary"
                >
                    + Nuevo Contacto
                </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map(client => (
                    <div key={client.id} className="card hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold">{client.nombre}</h3>
                                <p className="text-sm text-muted-foreground">{client.email || 'Sin email'}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setFormData(client); setShowForm(true); }}
                                    className="p-2 hover:bg-secondary rounded-full"
                                    title="Editar"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleDelete(client.id)}
                                    className="p-2 hover:bg-destructive/10 text-destructive rounded-full"
                                    title="Eliminar"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                            {client.telefono && <p>📞 {client.telefono}</p>}
                            {client.cif_nif && <p>🆔 {client.cif_nif}</p>}
                            {client.direccion && <p>📍 {client.direccion}</p>}
                        </div>

                        <button
                            onClick={() => handleGenerateInvoice(client)}
                            disabled={!!generatingInvoice}
                            className="w-full btn btn-outline border-primary/20 hover:bg-primary/5 text-primary"
                        >
                            {generatingInvoice === client.id ? 'Generando...' : '📄 Generar Factura de Productos'}
                        </button>
                    </div>
                ))}

                {clients.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                        <p>No tienes clientes guardados.</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="text-primary hover:underline mt-2"
                        >
                            Agrega tu primer proveedor
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-background card max-w-lg w-full shadow-xl">
                        <h2 className="text-2xl font-bold mb-6">
                            {formData.id ? 'Editar Cliente' : 'Nuevo Cliente/Proveedor'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre / Empresa *</label>
                                <input
                                    value={formData.nombre || ''}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    className="input w-full"
                                    placeholder="Ej: Distribuidora S.L."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                        value={formData.email || ''}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="input w-full"
                                        type="email"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                                    <input
                                        value={formData.telefono || ''}
                                        onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">CIF/NIF</label>
                                    <input
                                        value={formData.cif_nif || ''}
                                        onChange={e => setFormData({ ...formData, cif_nif: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Notas</label>
                                    <input
                                        value={formData.notas || ''}
                                        onChange={e => setFormData({ ...formData, notas: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Dirección</label>
                                <textarea
                                    value={formData.direccion || ''}
                                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                    className="input w-full"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => setShowForm(false)}
                                className="btn btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveClient}
                                className="btn btn-primary"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
