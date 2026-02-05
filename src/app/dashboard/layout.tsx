import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-transparent text-[#e5e5e5]">
            <nav className="bg-[#1a1a1a]/70 backdrop-blur-md border-b border-[#262626]">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/dashboard" className="text-xl font-light text-[#e5e5e5] hover:text-[#3b82f6] transition-colors">
                            Social CRM
                        </Link>
                        <div className="flex gap-6">
                            <Link
                                href="/dashboard/inbox"
                                className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors text-sm"
                            >
                                Inbox
                            </Link>
                            <Link
                                href="/dashboard/contacts"
                                className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors text-sm"
                            >
                                Contactos
                            </Link>
                            <Link
                                href="/dashboard/campaigns"
                                className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors text-sm"
                            >
                                Campañas
                            </Link>
                            <Link
                                href="/dashboard/team"
                                className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors text-sm"
                            >
                                Equipo
                            </Link>
                            <Link
                                href="/dashboard/settings"
                                className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors text-sm"
                            >
                                Configuración
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
            {children}
        </div>
    );
}
