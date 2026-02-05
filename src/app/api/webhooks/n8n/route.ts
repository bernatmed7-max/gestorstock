import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/crypto/hmac';
import { N8nWebhookPayload } from '@/types';

// POST /api/webhooks/n8n - Callback from n8n workflow
export async function POST(request: NextRequest) {
    try {
        // Validate webhook signature
        const signature = request.headers.get('x-signature');
        const timestamp = request.headers.get('x-timestamp');

        // Get raw body for signature verification
        const rawBody = await request.text();
        const payload: N8nWebhookPayload = JSON.parse(rawBody);

        if (!verifyWebhookSignature(signature, timestamp, rawBody)) {
            console.error('Invalid webhook signature');
            return NextResponse.json(
                { error: 'Firma inválida' },
                { status: 401 }
            );
        }

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
            .select('id, status, workspace_id, message_id, conversation_id')
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

        if (payload.meta?.n8n_execution_id) {
            updateData.n8n_execution_id = payload.meta.n8n_execution_id;
        }

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

        // If completed, save AI output
        if (payload.status === 'completed' && payload.output) {
            const { error: aiOutputError } = await supabase
                .from('ai_outputs')
                .insert({
                    workspace_id: existingJob.workspace_id,
                    job_id: payload.job_id,
                    message_id: existingJob.message_id,
                    conversation_id: existingJob.conversation_id,
                    intent: payload.output.intent,
                    urgency: payload.output.urgency,
                    sentiment: payload.output.sentiment,
                    summary: payload.output.summary,
                    suggested_reply: payload.output.suggested_reply,
                    confidence: payload.output.confidence,
                    language: payload.output.language,
                    entities: payload.output.entities,
                    routing: payload.output.routing,
                    meta: payload.meta,
                });

            if (aiOutputError) {
                console.error('Error saving AI output:', aiOutputError);
                // Don't fail the request - job is already updated
            }
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
