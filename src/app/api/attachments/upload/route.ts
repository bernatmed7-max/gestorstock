import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/attachments/upload - Upload attachment to Supabase Storage
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

        // Only admins and agents can upload
        if (workspaceUser.role === 'viewer') {
            return NextResponse.json(
                { error: 'No tienes permiso para subir archivos' },
                { status: 403 }
            );
        }

        const workspaceId = workspaceUser.workspace_id;

        // Get form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const conversationId = formData.get('conversation_id') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No se proporcionó archivo' },
                { status: 400 }
            );
        }

        // Validate file size (20 MB max)
        if (file.size > 20 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'El archivo excede 20 MB' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
            'video/mp4', 'video/webm', 'video/quicktime',
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: `Tipo de archivo no permitido: ${file.type}` },
                { status: 400 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'bin';
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
        const filename = `${timestamp}-${sanitizedName}`;

        // Build storage path: workspace_id/conversation_id/filename
        const storagePath = conversationId
            ? `${workspaceId}/${conversationId}/${filename}`
            : `${workspaceId}/general/${filename}`;

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json(
                { error: 'Error al subir archivo', details: uploadError.message },
                { status: 500 }
            );
        }

        // Get signed URL (valid for 1 hour) or public URL
        const { data: urlData } = await supabase.storage
            .from('attachments')
            .createSignedUrl(storagePath, 3600);

        return NextResponse.json({
            success: true,
            attachment: {
                name: file.name,
                type: file.type,
                size: file.size,
                path: uploadData.path,
                url: urlData?.signedUrl || null,
            },
        });

    } catch (error) {
        console.error('Attachment upload error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// GET /api/attachments/upload?path=xxx - Get signed URL for existing attachment
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
        const path = searchParams.get('path');

        if (!path) {
            return NextResponse.json(
                { error: 'Se requiere path' },
                { status: 400 }
            );
        }

        // Verify user has access to this workspace
        const workspaceId = path.split('/')[0];
        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .eq('workspace_id', workspaceId)
            .single();

        if (!workspaceUser) {
            return NextResponse.json(
                { error: 'No tienes acceso a este archivo' },
                { status: 403 }
            );
        }

        // Get signed URL
        const { data: urlData, error: urlError } = await supabase.storage
            .from('attachments')
            .createSignedUrl(path, 3600);

        if (urlError) {
            return NextResponse.json(
                { error: 'Error al generar URL', details: urlError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            url: urlData?.signedUrl,
            expires_in: 3600,
        });

    } catch (error) {
        console.error('Get attachment URL error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
