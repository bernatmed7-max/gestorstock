'use client';

import { useEffect, useState } from 'react';

interface TeamMember {
    id: string;
    role: string;
    profiles: {
        email: string;
        full_name: string;
        avatar_url: string | null;
    } | null;
}

export default function TeamPage() {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTeam();
    }, []);

    const loadTeam = async () => {
        try {
            const response = await fetch('/api/team');
            const data = await response.json();
            setTeam(data.team || []);
        } catch (error) {
            console.error('Error loading team:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center text-[#a3a3a3]">Cargando equipo...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-light mb-8 text-[#e5e5e5]">Equipo</h1>
            <div className="bg-[#1a1a1a] rounded-lg border border-[#262626] overflow-hidden">
                <table className="min-w-full divide-y divide-[#262626]">
                    <thead className="bg-[#0f0f0f]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[#a3a3a3] uppercase tracking-wider">
                                Miembro
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[#a3a3a3] uppercase tracking-wider">
                                Rol
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-[#1a1a1a] divide-y divide-[#262626]">
                        {team.map((member) => (
                            <tr key={member.id} className="hover:bg-[#0f0f0f] transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        {member.profiles?.avatar_url ? (
                                            <img
                                                src={member.profiles.avatar_url}
                                                alt={member.profiles.full_name || ''}
                                                className="w-10 h-10 rounded-full mr-3 border border-[#262626]"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center mr-3 border border-[#404040]">
                                                <span className="text-[#3b82f6] font-medium">
                                                    {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-sm font-medium text-[#e5e5e5]">
                                                {member.profiles?.full_name || 'Sin nombre'}
                                            </div>
                                            <div className="text-sm text-[#a3a3a3]">
                                                {member.profiles?.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#262626] text-[#3b82f6] border border-[#404040]">
                                        {member.role}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
