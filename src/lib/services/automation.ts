import { createAdminClient } from '@/lib/supabase/server';

export async function executeAutomationTrigger(
    workspaceId: string,
    triggerType: string,
    eventData: any
) {
    const supabase = createAdminClient();

    // 1. Fetch active automations for this trigger
    const { data: automations, error: fetchError } = await supabase
        .from('automations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('trigger_type', triggerType)
        .eq('is_active', true);

    if (fetchError) {
        console.error('Error fetching automations:', fetchError);
        return { error: 'DB Error' };
    }

    if (!automations || automations.length === 0) {
        return { executed: false, reason: 'No active automations' };
    }

    const executionResults = [];

    // 2. Execute each automation
    for (const automation of automations) {
        const flow = automation.flow_graph;

        if (triggerType === 'new_message') {
            const messageText = eventData.text?.toLowerCase() || '';

            // Filter Logic
            const filterNode = flow.nodes?.find((n: any) => n.type === 'filter');
            if (filterNode && filterNode.data?.keyword) {
                if (!messageText.includes(filterNode.data.keyword.toLowerCase())) {
                    executionResults.push({ id: automation.id, status: 'skipped', reason: 'Filter mismatch' });
                    continue;
                }
            }

            // Action Logic
            const actionNodes = flow.nodes?.filter((n: any) => n.type === 'send_message');
            for (const action of actionNodes) {
                if (eventData.conversation_id) {
                    // Insert Auto-Response
                    const { error: sendError } = await supabase
                        .from('messages')
                        .insert({
                            workspace_id: workspaceId,
                            conversation_id: eventData.conversation_id,
                            message_external_id: `auto_${Date.now()}_${crypto.randomUUID()}`,
                            direction: 'out',
                            type: 'text',
                            text: action.data.text,
                            status: 'pending',
                            timestamp: new Date().toISOString(),
                            metadata: { automation_id: automation.id, trigger: 'automation' }
                        });

                    if (sendError) {
                        console.error('Automation Send Error', sendError);
                    } else {
                        // TODO: Trigger n8n outbound here if needed
                    }
                }
            }
            executionResults.push({ id: automation.id, status: 'executed' });
        }
    }

    return { success: true, results: executionResults };
}
