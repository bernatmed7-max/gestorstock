'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [workspaceName, setWorkspaceName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (authData.user) {
            console.log('Signup successful', authData);

            if (!authData.session) {
                // Email confirmation required
                setLoading(false);
                setError('Cuenta creada. Por favor verifica tu email para continuar.');
                return;
            }

            // Create workspace
            const { error: workspaceError } = await supabase
                .from('workspaces')
                .insert({
                    name: workspaceName || `${fullName}'s Workspace`,
                    slug: workspaceName.toLowerCase().replace(/\s+/g, '-') || `workspace-${authData.user.id.slice(0, 8)}`,
                    created_by: authData.user.id,
                })
                .select('id')
                .single();

            if (workspaceError) {
                console.error('Error creating workspace:', workspaceError);
                setError('Error al crear workspace');
                setLoading(false);
                return;
            }

            // Add user to workspace as admin
            const { data: workspace } = await supabase
                .from('workspaces')
                .select('id')
                .eq('created_by', authData.user.id)
                .single();

            if (workspace) {
                await supabase
                    .from('workspace_users')
                    .insert({
                        workspace_id: workspace.id,
                        user_id: authData.user.id,
                        role: 'admin',
                    });
            }

            router.push('/dashboard');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
            <div className="max-w-md w-full bg-[#1a1a1a] p-8 rounded-lg border border-[#262626]">
                <h1 className="text-2xl font-light mb-8 text-center text-[#e5e5e5]">Crear Cuenta</h1>
                <form onSubmit={handleSignup} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                            Nombre Completo
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                            Nombre del Workspace
                        </label>
                        <input
                            type="text"
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-[#262626] rounded-md text-[#e5e5e5] focus:outline-none focus:border-[#3b82f6] transition-colors"
                        />
                    </div>
                    {error && (
                        <div className="text-red-400 text-sm">{error}</div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#3b82f6] text-white py-2.5 rounded-md hover:bg-[#2563eb] disabled:opacity-50 transition-colors font-medium"
                    >
                        {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-[#a3a3a3]">
                    ¿Ya tienes cuenta?{' '}
                    <Link href="/login" className="text-[#3b82f6] hover:text-[#2563eb] transition-colors">
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
