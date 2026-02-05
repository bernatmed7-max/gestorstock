import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 1. Get user's workspace
        const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .single();

        if (!workspaceUser) {
            return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 404 });
        }

        const searchParams = req.nextUrl.searchParams;
        const type = searchParams.get('type');
        const accountId = searchParams.get('account_id'); // Optional, to delete specific account

        if (!type) {
            return NextResponse.json({ error: 'Tipo de canal requerido' }, { status: 400 });
        }

        // 2. Delete channel(s)
        let query = supabase
            .from('channels')
            .delete()
            .eq('workspace_id', workspaceUser.workspace_id)
            .eq('channel', type);

        if (accountId) {
            query = query.eq('channel_account_id', accountId);
        }

        const { error } = await query;

        if (error) {
            console.error('Error deleting channel:', error);
            return NextResponse.json({ error: 'Error al desconectar el canal' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error in disconnect:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
