import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/team - Get team members
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

        // Get all team members
        const { data: teamMembers, error } = await supabase
            .from('workspace_users')
            .select(`
                id,
                role,
                created_at,
                profiles (
                    id,
                    email,
                    full_name,
                    avatar_url
                )
            `)
            .eq('workspace_id', workspaceUser.workspace_id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching team:', error);
            return NextResponse.json(
                { error: 'Error al obtener equipo' },
                { status: 500 }
            );
        }

        return NextResponse.json({ team: teamMembers || [] });

    } catch (error) {
        console.error('Team list error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
