interface Contact {
    name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
}

export function ContactSidebar({
    contact,
    onClose,
}: {
    contact: Contact;
    onClose?: () => void;
}) {
    return (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#1a1a1a] border-l border-[#262626] shadow-lg z-10">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
                <h3 className="font-medium text-[#e5e5e5]">Información del contacto</h3>
                <button
                    onClick={onClose}
                    className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
                >
                    ✕
                </button>
            </div>
            <div className="p-4 space-y-4">
                {contact.avatar_url && (
                    <div className="flex justify-center">
                        <img
                            src={contact.avatar_url}
                            alt={contact.name || 'Contact'}
                            className="w-24 h-24 rounded-full border-2 border-[#262626]"
                        />
                    </div>
                )}
                <div>
                    <label className="text-xs text-[#a3a3a3]">Nombre</label>
                    <p className="text-sm font-medium text-[#e5e5e5]">{contact.name || 'Sin nombre'}</p>
                </div>
                {contact.email && (
                    <div>
                        <label className="text-xs text-[#a3a3a3]">Email</label>
                        <p className="text-sm text-[#e5e5e5]">{contact.email}</p>
                    </div>
                )}
                {contact.phone && (
                    <div>
                        <label className="text-xs text-[#a3a3a3]">Teléfono</label>
                        <p className="text-sm text-[#e5e5e5]">{contact.phone}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
