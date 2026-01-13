import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateWebhookSignature } from '@/lib/n8n';
import { N8nWebhookPayload } from '@/types';

// POST /api/webhooks/n8n - Callback from n8n workflow
export async function POST(request: NextRequest) {
    try {
        // Validate webhook signature
        const signature = request.headers.get('x-webhook-signature');
        const timestamp = request.headers.get('x-webhook-timestamp');

        if (!validateWebhookSignature(signature, timestamp)) {
            console.error('Invalid webhook signature');
            return NextResponse.json(
                { error: 'Firma inválida' },
                { status: 401 }
            );
        }

        // Parse payload
        const payload: N8nWebhookPayload = await request.json();

        if (!payload.job_id) {
            return NextResponse.json(
                { error: 'job_id requerido' },
                { status: 400 }
            );
        }

        // Use admin client (service role) to bypass RLS
        const supabase = createAdminClient();

        // Check if job exists
        const { data: existingJob, error: fetchError } = await supabase
            .from('jobs')
            .select('id, status')
            .eq('id', payload.job_id)
            .single();

        if (fetchError || !existingJob) {
            return NextResponse.json(
                { error: 'Job no encontrado' },
                { status: 404 }
            );
        }

        // Idempotency: Don't update if already completed/failed
        if (existingJob.status === 'completed' || existingJob.status === 'failed') {
            return NextResponse.json({
                message: 'Job ya finalizado',
                status: existingJob.status,
            });
        }

        // Prepare update data
        const updateData: Record<string, unknown> = {
            status: payload.status,
            updated_at: new Date().toISOString(),
        };

        if (payload.status === 'completed') {
            updateData.output = payload.output;
            updateData.completed_at = new Date().toISOString();
        }

        if (payload.status === 'failed') {
            updateData.error = payload.error;
        }

        // Update job
        const { error: updateError } = await supabase
            .from('jobs')
            .update(updateData)
            .eq('id', payload.job_id);

        if (updateError) {
            console.error('Error updating job:', updateError);
            return NextResponse.json(
                { error: 'Error al actualizar el job' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            job_id: payload.job_id,
            status: payload.status,
        });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
