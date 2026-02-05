export default function PrivacyPolicyPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl text-[#e5e5e5]">
            <h1 className="text-3xl font-light mb-8">Política de Privacidad</h1>

            <div className="space-y-6 text-[#a3a3a3]">
                <section>
                    <h2 className="text-xl font-medium text-[#e5e5e5] mb-3">1. Introducción</h2>
                    <p>
                        Bienvenido a Social CRM. Nos comprometemos a proteger su privacidad y garantizar la seguridad de sus datos.
                        Esta política explica cómo recopilamos, utilizamos y protegemos su información cuando utiliza nuestra aplicación
                        y conecta sus redes sociales.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium text-[#e5e5e5] mb-3">2. Información que Recopilamos</h2>
                    <p>
                        Al conectar sus cuentas de redes sociales (Instagram, WhatsApp, Email, etc.), recopilamos la siguiente información:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Información de perfil público.</li>
                        <li>Mensajes entrantes y salientes para facilitar la gestión de conversaciones.</li>
                        <li>Datos de contacto de sus clientes (nombre, teléfono, email) necesarios para el funcionamiento del CRM.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-medium text-[#e5e5e5] mb-3">3. Uso de Inteligencia Artificial</h2>
                    <p>
                        Utilizamos servicios de Inteligencia Artificial (IA) para analizar mensajes y sugerir respuestas.
                        Al utilizar nuestra plataforma, usted acepta que:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>El contenido de los mensajes puede ser procesado por modelos de IA para generar resúmenes y sugerencias.</li>
                        <li>No utilizamos sus datos para entrenar modelos públicos sin su consentimiento explícito.</li>
                        <li>Las respuestas generadas son sugerencias y deben ser revisadas antes de su envío (en modo manual).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-medium text-[#e5e5e5] mb-3">4. Seguridad de los Datos</h2>
                    <p>
                        Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos contra el acceso no autorizado,
                        la pérdida o la alteración. Sus credenciales de redes sociales se almacenan de forma encriptada.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium text-[#e5e5e5] mb-3">5. Sus Derechos</h2>
                    <p>
                        Usted tiene derecho a acceder, rectificar o eliminar sus datos personales. Puede desconectar sus cuentas de redes sociales
                        en cualquier momento desde la configuración de la aplicación.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium text-[#e5e5e5] mb-3">6. Contacto</h2>
                    <p>
                        Si tiene preguntas sobre esta política, por favor contáctenos a través de nuestro soporte.
                    </p>
                </section>
            </div>
        </div>
    );
}
