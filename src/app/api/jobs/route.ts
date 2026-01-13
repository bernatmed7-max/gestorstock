import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { triggerN8nWorkflow } from '@/lib/n8n';
import { JobInput } from '@/types';

// POST /api/jobs - Create a new job and trigger n8n
export async function POST(request: NextRequest) {
    try {
        if (!process.env.N8N_WEBHOOK_URL) {
            console.error('❌ N8N_WEBHOOK_URL is not defined');
            return NextResponse.json(
                { error: 'Configuración de servidor incompleta: Falta N8N_WEBHOOK_URL' },
                { status: 500 }
            );
        }

        const supabase = await createClient();


        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        // Parse request body
        const body: JobInput = await request.json();

        if (!body.prompt || !body.inventario || body.inventario.length === 0) {
            return NextResponse.json(
                { error: 'Se requiere un prompt y un inventario con productos' },
                { status: 400 }
            );
        }

        // Create job in database
        const { data: job, error: insertError } = await supabase
            .from('jobs')
            .insert({
                user_id: user.id,
                status: 'pending',
                input: body,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating job:', insertError);
            return NextResponse.json(
                { error: 'Error al crear el job' },
                { status: 500 }
            );
        }

        // Update job status to running
        await supabase
            .from('jobs')
            .update({ status: 'running' })
            .eq('id', job.id);

        // Trigger n8n workflow
        const n8nResult = await triggerN8nWorkflow(job.id, body);

        if (!n8nResult.success) {
            // Mark job as failed
            await supabase
                .from('jobs')
                .update({
                    status: 'failed',
                    error: { code: 'N8N_ERROR', message: n8nResult.error || 'Error en n8n' },
                })
                .eq('id', job.id);

            return NextResponse.json(
                { error: 'Error al procesar el gráfico', job_id: job.id },
                { status: 500 }
            );
        }

        // If n8n returns data immediately (synchronous response)
        if (n8nResult.data) {
            let outputData = n8nResult.data as Record<string, unknown>;

            // Handle Gemini text response (JSON wrapped in markdown code blocks)
            if (outputData.text && typeof outputData.text === 'string') {
                try {
                    let jsonText = outputData.text as string;

                    // Remove markdown code blocks if present
                    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
                    if (jsonMatch) {
                        jsonText = jsonMatch[1].trim();
                    }

                    // Parse the JSON
                    const parsedData = JSON.parse(jsonText);
                    console.log('📊 Parsed chart data:', JSON.stringify(parsedData, null, 2));
                    outputData = parsedData;
                } catch (parseError) {
                    console.error('Error parsing Gemini response:', parseError);
                    // Keep original data if parsing fails
                }
            }

            await supabase
                .from('jobs')
                .update({
                    status: 'completed',
                    output: outputData,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', job.id);

            return NextResponse.json({
                job_id: job.id,
                status: 'completed',
                output: outputData,
            });
        }

        // Return job info for polling
        return NextResponse.json({
            job_id: job.id,
            status: 'running',
            message: 'Job creado. Procesando...',
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// GET /api/jobs - List user's jobs
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

        const { data: jobs, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            return NextResponse.json(
                { error: 'Error al obtener los jobs' },
                { status: 500 }
            );
        }

        return NextResponse.json({ jobs });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
