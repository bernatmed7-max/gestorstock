import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logContactEvent } from '@/lib/audit/audit';

// POST /api/contacts/merge - Merge two contacts into one
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
        const { keep_contact_id, merge_contact_id } = body;

        if (!keep_contact_id || !merge_contact_id) {
            return NextResponse.json(
                { error: 'Se requieren keep_contact_id y merge_contact_id' },
                { status: 400 }
            );
        }

        if (keep_contact_id === merge_contact_id) {
            return NextResponse.json(
                { error: 'No se puede fusionar un contacto consigo mismo' },
                { status: 400 }
            );
        }

        // Get user's workspace and verify role
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

        // Only admins and agents can merge contacts
        if (workspaceUser.role === 'viewer') {
            return NextResponse.json(
                { error: 'No tienes permiso para fusionar contactos' },
                { status: 403 }
            );
        }

        const workspaceId = workspaceUser.workspace_id;

        // Verify both contacts belong to the workspace
        const { data: keepContact } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', keep_contact_id)
            .eq('workspace_id', workspaceId)
            .single();

        const { data: mergeContact } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', merge_contact_id)
            .eq('workspace_id', workspaceId)
            .single();

        if (!keepContact || !mergeContact) {
            return NextResponse.json(
                { error: 'Uno o ambos contactos no existen en este workspace' },
                { status: 404 }
            );
        }

        // Check if either contact is already merged
        if (keepContact.merged_into_id || mergeContact.merged_into_id) {
            return NextResponse.json(
                { error: 'Uno de los contactos ya ha sido fusionado' },
                { status: 400 }
            );
        }

        // Combine channel identifiers
        const keepIdentifiers = keepContact.channel_identifiers || {};
        const mergeIdentifiers = mergeContact.channel_identifiers || {};

        const combinedIdentifiers: Record<string, string[]> = {};

        for (const channel of ['instagram_dm', 'whatsapp_business', 'email']) {
            const keepIds = keepIdentifiers[channel] || [];
            const mergeIds = mergeIdentifiers[channel] || [];
            const combined = [...new Set([...keepIds, ...mergeIds])];
            if (combined.length > 0) {
                combinedIdentifiers[channel] = combined;
            }
        }

        // Combine other fields (prefer keep_contact values, fill with merge_contact if empty)
        const combinedData = {
            name: keepContact.name || mergeContact.name,
            email: keepContact.email || mergeContact.email,
            phone: keepContact.phone || mergeContact.phone,
            avatar_url: keepContact.avatar_url || mergeContact.avatar_url,
            channel_identifiers: combinedIdentifiers,
            metadata: {
                ...(mergeContact.metadata || {}),
                ...(keepContact.metadata || {}),
                merged_from: merge_contact_id,
                merged_at: new Date().toISOString(),
            },
        };

        // Update keep_contact with combined data
        const { error: updateKeepError } = await supabase
            .from('contacts')
            .update(combinedData)
            .eq('id', keep_contact_id);

        if (updateKeepError) {
            return NextResponse.json(
                { error: 'Error al actualizar contacto principal', details: updateKeepError },
                { status: 500 }
            );
        }

        // Reassign all conversations from merge_contact to keep_contact
        const { error: updateConversationsError } = await supabase
            .from('conversations')
            .update({ contact_id: keep_contact_id })
            .eq('contact_id', merge_contact_id);

        if (updateConversationsError) {
            console.error('Error reassigning conversations:', updateConversationsError);
        }

        // Mark merge_contact as merged
        const { error: updateMergeError } = await supabase
            .from('contacts')
            .update({ merged_into_id: keep_contact_id })
            .eq('id', merge_contact_id);

        if (updateMergeError) {
            console.error('Error marking contact as merged:', updateMergeError);
        }

        // Log audit events
        await logContactEvent(
            workspaceId,
            keep_contact_id,
            'contact.merged',
            user.id,
            { merged_contact_id: merge_contact_id, original_data: keepContact },
            combinedData,
            request
        );

        return NextResponse.json({
            success: true,
            contact_id: keep_contact_id,
            merged_from: merge_contact_id,
            message: 'Contactos fusionados correctamente',
        });

    } catch (error) {
        console.error('Contact merge error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// GET /api/contacts/merge?email=x&phone=y - Find potential duplicate contacts
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
        const email = searchParams.get('email');
        const phone = searchParams.get('phone');

        if (!email && !phone) {
            return NextResponse.json(
                { error: 'Se requiere email o phone para buscar duplicados' },
                { status: 400 }
            );
        }

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

        // Build query to find potential duplicates
        let query = supabase
            .from('contacts')
            .select('*')
            .eq('workspace_id', workspaceUser.workspace_id)
            .is('merged_into_id', null);

        if (email) {
            query = query.or(`email.eq.${email},channel_identifiers->email.cs.["${email}"]`);
        }

        if (phone) {
            query = query.or(`phone.eq.${phone},channel_identifiers->whatsapp_business.cs.["${phone}"]`);
        }

        const { data: contacts, error } = await query;

        if (error) {
            return NextResponse.json(
                { error: 'Error al buscar contactos', details: error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            contacts: contacts || [],
            count: contacts?.length || 0,
        });

    } catch (error) {
        console.error('Contact search error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
