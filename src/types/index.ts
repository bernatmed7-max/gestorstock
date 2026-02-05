// Canonical types for Social CRM

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ConversationStatus = 'open' | 'pending' | 'closed';
export type Intent = 'venta' | 'soporte' | 'informacion' | 'otro';
export type Urgency = 'baja' | 'media' | 'alta' | 'critica';
export type Sentiment = 'positivo' | 'neutro' | 'negativo';
export type Channel = 'instagram_dm' | 'whatsapp_business' | 'email' | 'telegram_bot';
export type Role = 'admin' | 'agent' | 'viewer';
export type MessageDirection = 'in' | 'out';

// Message attachment
export interface MessageAttachment {
    name: string;
    type: string;
    size: number;
    url: string;
}

// Context for AI analysis
export interface MessageContext {
    last_messages: Array<{
        direction: MessageDirection;
        text: string;
        timestamp: string;
    }>;
    language_detected?: string;
    style_profile_id?: string;
}

// Input to n8n webhook
export interface N8nJobInput {
    job_id: string;
    workspace_id: string;
    user_id?: string;
    channel: Channel;
    channel_account_id: string;
    conversation_external_id: string;
    message_external_id: string;
    contact_external_id?: string;
    direction: MessageDirection;
    text: string;
    attachments?: MessageAttachment[];
    timestamp: string;
    context: MessageContext;
}

// Output from n8n callback
export interface N8nJobOutput {
    intent: Intent;
    urgency: Urgency;
    sentiment: Sentiment;
    summary: string;
    suggested_reply: string;
    confidence: number;
    language: string;
    entities: Record<string, unknown>;
    routing: {
        recommended_role: Role;
        priority: number;
        auto_send_recommended: boolean;
    };
}

// Callback payload from n8n
export interface N8nWebhookPayload {
    job_id: string;
    status: JobStatus;
    output?: N8nJobOutput;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta: {
        n8n_execution_id: string;
        model: string;
        prompt_version: string;
        latency_ms: number;
    };
}

// Audit Log
export type AuditAction =
    | 'message.created'
    | 'message.sent'
    | 'conversation.created'
    | 'conversation.closed'
    | 'conversation.assigned'
    | 'contact.created'
    | 'contact.merged'
    | 'contact.updated'
    | 'job.created'
    | 'job.completed'
    | 'job.failed'
    | 'channel.connected'
    | 'channel.disconnected'
    | 'team.member_added'
    | 'team.member_removed'
    | 'team.role_changed';

export interface AuditLog {
    id: string;
    workspace_id: string;
    user_id?: string;
    action: AuditAction;
    entity_type: string;
    entity_id?: string;
    old_data?: Record<string, unknown>;
    new_data?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

// Email Threading
export interface EmailThreadingInfo {
    email_subject?: string;
    email_thread_id?: string;
    email_message_id?: string;
    email_in_reply_to?: string;
    email_references?: string[];
}

// Enhanced Contact
export interface ChannelIdentifiers {
    instagram_dm?: string[];
    whatsapp_business?: string[];
    email?: string[];
}

export interface Contact {
    id: string;
    workspace_id: string;
    contact_external_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    channel_identifiers: ChannelIdentifiers;
    merged_into_id?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// Message Status & Type
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file' | 'template' | 'internal_note';

// Payload from n8n (Inbound Message)
export interface InboundMessagePayload {
    contact_id?: string; // Optional if we want to lookup by phone/email
    contact_phone?: string;
    contact_email?: string;
    contact_name?: string;
    channel: Channel;
    channel_account_id: string; // The business phone ID or page ID
    conversation_external_id: string; // The phone number of the user or thread ID
    message_external_id: string;
    direction: MessageDirection;
    type: MessageType;
    text?: string;
    attachments?: MessageAttachment[];
    timestamp: string;
    metadata?: Record<string, unknown>;
}

// Conversation with Email Threading & CRM
export interface Conversation {
    id: string;
    workspace_id: string;
    channel_id?: string;
    channel: Channel;
    conversation_external_id: string;
    contact_id?: string;
    status: ConversationStatus;
    assigned_to?: string;
    unread_count: number;
    last_message_at?: string;
    email_subject?: string;
    email_thread_id?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// Message with Email Threading & Status
export interface Message {
    id: string;
    workspace_id: string;
    conversation_id: string;
    message_external_id: string;
    direction: MessageDirection;
    type: MessageType;
    text: string | null;
    status: MessageStatus;
    attachments?: MessageAttachment[];
    timestamp: string;
    email_message_id?: string;
    email_in_reply_to?: string;
    email_references?: string[];
    metadata?: Record<string, unknown>;
    created_at: string;
}

// AI Output from n8n analysis
export interface AIOutput {
    id: string;
    job_id: string;
    message_id?: string;
    conversation_id?: string;
    intent: Intent;
    urgency: Urgency;
    sentiment: Sentiment;
    summary: string;
    suggested_reply: string;
    confidence: number;
    language: string;
    entities: Record<string, unknown>;
    routing: {
        recommended_role: Role;
        priority: number;
        auto_send_recommended: boolean;
    };
    meta: {
        n8n_execution_id: string;
        model: string;
        prompt_version: string;
        latency_ms: number;
    };
    created_at: string;
}
