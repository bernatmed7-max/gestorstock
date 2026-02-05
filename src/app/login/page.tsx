'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
            <div className="max-w-md w-full bg-[#1a1a1a] p-8 rounded-lg border border-[#262626]">
                <h1 className="text-2xl font-light mb-8 text-center text-[#e5e5e5]">Iniciar Sesión</h1>
                <form onSubmit={handleLogin} className="space-y-5">
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
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-[#a3a3a3]">
                    ¿No tienes cuenta?{' '}
                    <Link href="/signup" className="text-[#3b82f6] hover:text-[#2563eb] transition-colors">
                        Regístrate
                    </Link>
                </p>
            </div>
        </div>
    );
}
