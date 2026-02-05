'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Contact {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    channel_identifiers: Record<string, string[]>;
    updated_at: string;
    conversations: { count: number }[];
}

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async (searchQuery?: string) => {
        setLoading(true);
        try {
            const url = searchQuery
                ? `/api/contacts?search=${encodeURIComponent(searchQuery)}`
                : '/api/contacts';
            const response = await fetch(url);
            const data = await response.json();
            setContacts(data.contacts || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadContacts(search);
    };

    const getChannelIcons = (identifiers: Record<string, string[]>) => {
        const icons = [];
        if (identifiers?.instagram_dm?.length) icons.push('📷');
        if (identifiers?.whatsapp_business?.length) icons.push('💬');
        if (identifiers?.email?.length) icons.push('📧');
        return icons;
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-[#0f0f0f]">
            {/* Header */}
            <div className="bg-[#1a1a1a] border-b border-[#262626] p-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-light text-[#e5e5e5]">Contactos</h1>
                    <span className="text-sm text-[#a3a3a3]">
                        {total} contacto{total !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre, email o teléfono..."
                        className="flex-1 bg-[#262626] border border-[#3a3a3a] rounded-lg px-4 py-2 text-[#e5e5e5] placeholder-[#737373] focus:outline-none focus:border-[#3b82f6]"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors"
                    >
                        Buscar
                    </button>
                    {search && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                loadContacts();
                            }}
                            className="px-4 py-2 bg-[#262626] text-[#a3a3a3] rounded-lg hover:text-[#e5e5e5] transition-colors"
                        >
                            Limpiar
                        </button>
                    )}
                </form>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-8 text-center text-[#a3a3a3]">
                        Cargando contactos...
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="p-8 text-center text-[#a3a3a3]">
                        {search ? 'No se encontraron contactos' : 'No hay contactos aún'}
                    </div>
                ) : (
                    <div className="divide-y divide-[#262626]">
                        {contacts.map((contact) => (
                            <Link
                                key={contact.id}
                                href={`/dashboard/contacts/${contact.id}`}
                                className="block p-4 hover:bg-[#1a1a1a] transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-lg font-medium text-white flex-shrink-0">
                                        {contact.name?.charAt(0) || contact.email?.charAt(0) || '?'}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-[#e5e5e5] truncate">
                                                {contact.name || 'Sin nombre'}
                                            </span>
                                            {getChannelIcons(contact.channel_identifiers).map((icon, idx) => (
                                                <span key={idx} className="text-sm">{icon}</span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-[#a3a3a3]">
                                            {contact.email && (
                                                <span className="truncate">{contact.email}</span>
                                            )}
                                            {contact.phone && (
                                                <span>{contact.phone}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Meta */}
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-sm text-[#737373]">
                                            {contact.conversations?.[0]?.count || 0} conv.
                                        </div>
                                        <div className="text-xs text-[#525252]">
                                            {formatDate(contact.updated_at)}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
