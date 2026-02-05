import { ContactConversations } from '@/components/contacts/ContactConversations';

interface ContactDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
    const { id } = await params;

    return (
        <div className="h-[calc(100vh-64px)]">
            <ContactConversations contactId={id} />
        </div>
    );
}
