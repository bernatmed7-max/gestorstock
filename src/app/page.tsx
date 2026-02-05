import Link from 'next/link';

export default function Home() {
    return (
        <div className="min-h-screen relative bg-transparent">
            {/* Content Overlay */}
            <div className="relative z-10 container mx-auto px-4 py-20">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl font-light text-[#e5e5e5] mb-6 tracking-tight font-sentient">
                        Social CRM Omnicanal
                    </h1>
                    <p className="text-xl text-[#a3a3a3] mb-12 font-light">
                        Centraliza Instagram DM, WhatsApp Business y Email en un inbox único.
                        <br />
                        Con IA para clasificar, resumir y proponer respuestas personalizadas.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link
                            href="/signup"
                            className="bg-[#3b82f6] text-white px-8 py-3 rounded-md font-medium hover:bg-[#2563eb] transition-colors"
                        >
                            Comenzar
                        </Link>
                        <Link
                            href="/login"
                            className="bg-transparent text-[#e5e5e5] px-8 py-3 rounded-md font-medium border border-[#262626] hover:border-[#404040] transition-colors"
                        >
                            Iniciar Sesión
                        </Link>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto mt-24 grid md:grid-cols-3 gap-6">
                    <div className="bg-[#1a1a1a]/80 backdrop-blur-md p-8 rounded-lg border border-[#262626]">
                        <h3 className="text-lg font-medium mb-3 text-[#e5e5e5]">Inbox Unificado</h3>
                        <p className="text-[#a3a3a3] text-sm leading-relaxed">
                            Todas tus conversaciones de Instagram, WhatsApp y Email en un solo lugar.
                        </p>
                    </div>
                    <div className="bg-[#1a1a1a]/80 backdrop-blur-md p-8 rounded-lg border border-[#262626]">
                        <h3 className="text-lg font-medium mb-3 text-[#e5e5e5]">IA Inteligente</h3>
                        <p className="text-[#a3a3a3] text-sm leading-relaxed">
                            Clasificación automática, resúmenes y respuestas sugeridas adaptadas a tu estilo.
                        </p>
                    </div>
                    <div className="bg-[#1a1a1a]/80 backdrop-blur-md p-8 rounded-lg border border-[#262626]">
                        <h3 className="text-lg font-medium mb-3 text-[#e5e5e5]">Historial Completo</h3>
                        <p className="text-[#a3a3a3] text-sm leading-relaxed">
                            Guarda todas las conversaciones y crea contactos automáticamente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
