import { createClient as createServerClient } from '@/lib/supabase/server';
import { AuditAction } from '@/types';

export interface AuditLogParams {
    workspaceId: string;
    userId?: string;
    action: AuditAction;
    entityType: string;
    entityId?: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    request?: Request;
}

/**
 * Log an audit event to the database
 * Should be called using the service role client for inserts
 */
export async function logAudit(params: AuditLogParams): Promise<string | null> {
    try {
        const supabase = await createServerClient();

        // Extract IP and User-Agent from request if provided
        let ipAddress: string | undefined;
        let userAgent: string | undefined;

        if (params.request) {
            ipAddress = params.request.headers.get('x-forwarded-for')?.split(',')[0]
                || params.request.headers.get('x-real-ip')
                || undefined;
            userAgent = params.request.headers.get('user-agent') || undefined;
        }

        const { data, error } = await supabase
            .from('audit_log')
            .insert({
                workspace_id: params.workspaceId,
                user_id: params.userId,
                action: params.action,
                entity_type: params.entityType,
                entity_id: params.entityId,
                old_data: params.oldData,
                new_data: params.newData,
                ip_address: ipAddress,
                user_agent: userAgent,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Audit log error:', error);
            return null;
        }

        return data?.id || null;
    } catch (error) {
        console.error('Audit log exception:', error);
        return null;
    }
}

/**
 * Helper to log message events
 */
export async function logMessageEvent(
    workspaceId: string,
    messageId: string,
    action: 'message.created' | 'message.sent',
    userId?: string,
    request?: Request
): Promise<void> {
    await logAudit({
        workspaceId,
        userId,
        action,
        entityType: 'message',
        entityId: messageId,
        request,
    });
}

/**
 * Helper to log conversation events
 */
export async function logConversationEvent(
    workspaceId: string,
    conversationId: string,
    action: 'conversation.created' | 'conversation.closed' | 'conversation.assigned',
    userId?: string,
    oldData?: Record<string, unknown>,
    newData?: Record<string, unknown>,
    request?: Request
): Promise<void> {
    await logAudit({
        workspaceId,
        userId,
        action,
        entityType: 'conversation',
        entityId: conversationId,
        oldData,
        newData,
        request,
    });
}

/**
 * Helper to log contact events
 */
export async function logContactEvent(
    workspaceId: string,
    contactId: string,
    action: 'contact.created' | 'contact.merged' | 'contact.updated',
    userId?: string,
    oldData?: Record<string, unknown>,
    newData?: Record<string, unknown>,
    request?: Request
): Promise<void> {
    await logAudit({
        workspaceId,
        userId,
        action,
        entityType: 'contact',
        entityId: contactId,
        oldData,
        newData,
        request,
    });
}

/**
 * Helper to log job events
 */
export async function logJobEvent(
    workspaceId: string,
    jobId: string,
    action: 'job.created' | 'job.completed' | 'job.failed',
    userId?: string
): Promise<void> {
    await logAudit({
        workspaceId,
        userId,
        action,
        entityType: 'job',
        entityId: jobId,
    });
}
