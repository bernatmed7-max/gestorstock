import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <span className="font-bold text-lg">Gestor de Stock</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Iniciar Sesión
              </Link>
              <Link href="/signup" className="btn btn-primary text-sm py-2">
                Empezar Gratis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
            Control de Stock
            <span className="gradient-text block">Inteligente</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Gestiona tu inventario, calcula estados de stock automáticamente y genera
            gráficos personalizados con inteligencia artificial.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn btn-primary text-base px-8 py-3">
              Comenzar Gratis
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="/login" className="btn btn-secondary text-base px-8 py-3">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Todo lo que necesitas para gestionar tu stock
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Herramientas profesionales de gestión de inventario en una interfaz moderna y fácil de usar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card hover-lift">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Importa desde Excel</h3>
              <p className="text-muted-foreground">
                Sube tus archivos .xls o .xlsx y carga tu inventario en segundos. Compatible con cualquier formato de hoja de cálculo.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card hover-lift">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Cálculo Automático</h3>
              <p className="text-muted-foreground">
                Define stock mínimo, ideal y máximo. El sistema calcula automáticamente qué productos necesitas reponer.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card hover-lift">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Gráficos con IA</h3>
              <p className="text-muted-foreground">
                Describe el gráfico que necesitas en lenguaje natural y déjale a la IA generarlo automáticamente para ti.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Color Status Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card glass">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Estados de Stock Visuales
              </h2>
              <p className="text-muted-foreground">
                Identifica de un vistazo qué productos necesitan atención
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl stock-bajo border text-center">
                <div className="text-4xl mb-3">🔴</div>
                <h3 className="font-semibold text-lg mb-1">Bajo Stock</h3>
                <p className="text-sm opacity-80">Necesita compra urgente</p>
              </div>
              <div className="p-6 rounded-xl stock-correcto border text-center">
                <div className="text-4xl mb-3">🟡</div>
                <h3 className="font-semibold text-lg mb-1">Stock Correcto</h3>
                <p className="text-sm opacity-80">Niveles óptimos</p>
              </div>
              <div className="p-6 rounded-xl stock-alto border text-center">
                <div className="text-4xl mb-3">🟢</div>
                <h3 className="font-semibold text-lg mb-1">Stock Alto</h3>
                <p className="text-sm opacity-80">En el máximo o más</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            ¿Listo para optimizar tu inventario?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Empieza gratis hoy y descubre cómo la IA puede transformar tu gestión de stock.
          </p>
          <Link href="/signup" className="btn btn-primary text-lg px-10 py-4">
            Crear Cuenta Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z"
                  />
                </svg>
              </div>
              <span className="font-semibold">Gestor de Stock</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Gestor de Stock. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
