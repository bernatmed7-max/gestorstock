import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/jobs - Create job manually (optional endpoint)
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
        const { message_id, conversation_id, input } = body;

        if (!input) {
            return NextResponse.json(
                { error: 'Input requerido' },
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

        const jobId = crypto.randomUUID();

        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .insert({
                id: jobId,
                workspace_id: workspaceUser.workspace_id,
                message_id,
                conversation_id,
                status: 'pending',
                input,
            })
            .select('id')
            .single();

        if (jobError || !job) {
            return NextResponse.json(
                { error: 'Error al crear job', details: jobError },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            job_id: job.id,
        });

    } catch (error) {
        console.error('Create job error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
