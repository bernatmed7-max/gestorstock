import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/style-profiles - Create or update style profile
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
        const { name, description, training_samples, prompt_template, is_default } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'Nombre requerido' },
                { status: 400 }
            );
        }

        // Get user's workspace
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

        // Only agents and admins can create style profiles
        if (workspaceUser.role !== 'admin' && workspaceUser.role !== 'agent') {
            return NextResponse.json(
                { error: 'No autorizado para crear perfiles de estilo' },
                { status: 403 }
            );
        }

        // If setting as default, unset other defaults
        if (is_default) {
            await supabase
                .from('style_profiles')
                .update({ is_default: false })
                .eq('workspace_id', workspaceUser.workspace_id)
                .eq('is_default', true);
        }

        const { data: styleProfile, error: profileError } = await supabase
            .from('style_profiles')
            .insert({
                workspace_id: workspaceUser.workspace_id,
                user_id: user.id,
                name,
                description,
                training_samples: training_samples || null,
                prompt_template: prompt_template || null,
                is_default: is_default || false,
            })
            .select('id')
            .single();

        if (profileError || !styleProfile) {
            return NextResponse.json(
                { error: 'Error al crear perfil de estilo', details: profileError },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            style_profile_id: styleProfile.id,
        });

    } catch (error) {
        console.error('Create style profile error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
