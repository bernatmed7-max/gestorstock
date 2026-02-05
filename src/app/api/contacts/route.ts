import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/contacts - List all contacts
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Get user's workspace
        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!workspaceUser) {
            return NextResponse.json(
                { error: 'Usuario no pertenece a ningún workspace' },
                { status: 403 }
            );
        }

        // Build query
        let query = supabase
            .from('contacts')
            .select('*, conversations(count)', { count: 'exact' })
            .eq('workspace_id', workspaceUser.workspace_id)
            .is('merged_into_id', null)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Add search filter if provided
        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        const { data: contacts, error, count } = await query;

        if (error) {
            return NextResponse.json(
                { error: 'Error al obtener contactos', details: error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            contacts: contacts || [],
            total: count || 0,
            limit,
            offset,
        });

    } catch (error) {
        console.error('List contacts error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, email, phone, metadata } = body;

        // Get user's workspace and role
        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id, role')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!workspaceUser) {
            return NextResponse.json(
                { error: 'Usuario no pertenece a ningún workspace' },
                { status: 403 }
            );
        }

        if (workspaceUser.role === 'viewer') {
            return NextResponse.json(
                { error: 'No tienes permiso para crear contactos' },
                { status: 403 }
            );
        }

        // Create contact
        const { data: contact, error: createError } = await supabase
            .from('contacts')
            .insert({
                workspace_id: workspaceUser.workspace_id,
                name,
                email,
                phone,
                metadata,
                channel_identifiers: {},
            })
            .select()
            .single();

        if (createError) {
            return NextResponse.json(
                { error: 'Error al crear contacto', details: createError },
                { status: 500 }
            );
        }

        return NextResponse.json(contact, { status: 201 });

    } catch (error) {
        console.error('Create contact error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
