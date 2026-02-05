import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/jobs/[id] - Get job status and output
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', id)
            .single();

        if (jobError || !job) {
            return NextResponse.json(
                { error: 'Job no encontrado' },
                { status: 404 }
            );
        }

        // Verify user has access to this workspace
        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .eq('workspace_id', job.workspace_id)
            .single();

        if (!workspaceUser) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 403 }
            );
        }

        // Get AI output if exists
        const { data: aiOutput } = await supabase
            .from('ai_outputs')
            .select('*')
            .eq('job_id', id)
            .single();

        return NextResponse.json({
            ...job,
            ai_output: aiOutput || null,
        });

    } catch (error) {
        console.error('Get job error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
