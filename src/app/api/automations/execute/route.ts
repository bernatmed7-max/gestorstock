import { NextRequest, NextResponse } from 'next/server';
import { executeAutomationTrigger } from '@/lib/services/automation';

// Simple Automation Engine
// Validates conditions and executes actions based on a flow graph
// Trigger -> Filter/Condition -> Action

// POST /api/automations/execute
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { trigger_type, event_data } = body;

        if (!trigger_type || !event_data) {
            return NextResponse.json({ error: 'Missing trigger data' }, { status: 400 });
        }

        const workspaceId = event_data.workspace_id;
        if (!workspaceId) {
            return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 });
        }

        const result = await executeAutomationTrigger(workspaceId, trigger_type, event_data);
        return NextResponse.json(result);

    } catch (error) {
        console.error('Automation Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
