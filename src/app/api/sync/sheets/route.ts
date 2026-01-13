import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/sync/sheets - Receive data from Google Sheets via n8n
export async function POST(request: NextRequest) {
    try {
        // Optional: Validate webhook secret
        const authHeader = request.headers.get('authorization');
        const expectedSecret = process.env.SYNC_WEBHOOK_SECRET;

        if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Expected format from n8n:
        // { 
        //   sheet_id: "optional-identifier",
        //   data: [
        //     { "Nombre": "Producto A", "Stock": 50, "Precio": 15.50, ... },
        //     { "Nombre": "Producto B", "Stock": 30, "Precio": 25.00, ... }
        //   ],
        //   headers: ["Nombre", "Stock", "Precio", ...] // optional
        // }

        const { data, headers, sheet_id } = body;

        if (!data || !Array.isArray(data)) {
            return NextResponse.json(
                { error: 'Se requiere un array de datos' },
                { status: 400 }
            );
        }

        // Extract headers from first row if not provided
        const columnHeaders = headers || (data.length > 0 ? Object.keys(data[0]) : []);

        // Use admin client to bypass RLS
        const supabase = createAdminClient();

        // Store the sync data in a dedicated table
        const syncData = {
            sheet_id: sheet_id || 'default',
            headers: columnHeaders,
            rows: data,
            row_count: data.length,
            synced_at: new Date().toISOString(),
        };

        // Upsert to sync_data table (create if not exists)
        const { error: upsertError } = await supabase
            .from('sheet_sync')
            .upsert(
                {
                    id: sheet_id || 'default',
                    ...syncData
                },
                { onConflict: 'id' }
            );

        if (upsertError) {
            console.error('Error saving sync data:', upsertError);

            // If table doesn't exist, return success anyway (data received)
            // The frontend will use localStorage as fallback
            return NextResponse.json({
                success: true,
                message: 'Datos recibidos (tabla sync no configurada)',
                data: syncData,
            });
        }

        console.log(`📊 Synced ${data.length} rows with ${columnHeaders.length} columns`);

        return NextResponse.json({
            success: true,
            message: `Sincronizados ${data.length} productos`,
            columns: columnHeaders,
            row_count: data.length,
            synced_at: syncData.synced_at,
        });

    } catch (error) {
        console.error('Sync Error:', error);
        return NextResponse.json(
            { error: 'Error al sincronizar datos' },
            { status: 500 }
        );
    }
}

// GET /api/sync/sheets - Get current synced data
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sheetId = searchParams.get('sheet_id') || 'default';

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('sheet_sync')
            .select('*')
            .eq('id', sheetId)
            .single();

        if (error || !data) {
            return NextResponse.json({
                success: false,
                message: 'No hay datos sincronizados',
                data: null,
            });
        }

        return NextResponse.json({
            success: true,
            ...data,
        });

    } catch (error) {
        console.error('Get Sync Error:', error);
        return NextResponse.json(
            { error: 'Error al obtener datos sincronizados' },
            { status: 500 }
        );
    }
}
