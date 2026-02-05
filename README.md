# Social CRM Omnicanal con IA

Un CRM omnicanal que centraliza Instagram DM, WhatsApp Business y Email en un inbox único tipo chat, con IA orquestada con n8n para clasificar, resumir y proponer respuestas adaptadas al estilo personal de cada equipo.

## Características

- 📱 **Inbox Unificado**: Todas las conversaciones en un solo lugar
- 🤖 **IA Inteligente**: Clasificación automática, resúmenes y respuestas sugeridas
- 📊 **Historial Completo**: Guarda todas las conversaciones y crea contactos automáticamente
- 🔐 **Multi-workspace**: Soporte para múltiples equipos con control de acceso por roles
- 🔒 **Seguridad**: Firma HMAC para webhooks, cifrado de tokens de canales

## Stack Tecnológico

- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Automatización**: n8n (autoalojado)
- **Hosting**: Vercel

## Instalación

### 1. Clonar e instalar dependencias

```bash
cd social-crm
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` basado en `.env.example`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# n8n
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/message-analysis
N8N_WEBHOOK_SECRET=tu_secret_de_32_caracteres_minimo

# Instagram (opcional)
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=

# WhatsApp Business (opcional)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=

# Email (opcional)
EMAIL_PROVIDER_API_KEY=

# App
APP_BASE_URL=http://localhost:3000
APP_ENCRYPTION_KEY=tu_clave_de_32_bytes_en_hex
```

**Importante**: 
- `N8N_WEBHOOK_SECRET` debe tener al menos 32 caracteres
- `APP_ENCRYPTION_KEY` debe ser una clave de 32 bytes en formato hex (64 caracteres)

### 3. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script SQL en el SQL Editor de Supabase:
   ```bash
   # Copia y pega el contenido de supabase-schema.sql
   ```

3. Verifica que todas las tablas se crearon correctamente

### 4. Configurar n8n

1. Importa el workflow desde `n8n-workflow-example.json` o crea uno nuevo basado en `n8n-contracts.md`
2. Configura las variables de entorno en n8n:
   - `N8N_WEBHOOK_SECRET` (mismo que en la app)
   - `OPENAI_API_KEY` o `ANTHROPIC_API_KEY`
   - `APP_BASE_URL`
3. Activa el workflow y copia la URL del webhook

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
social-crm/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # Route Handlers (API endpoints)
│   │   ├── dashboard/          # Páginas del dashboard
│   │   ├── login/              # Página de login
│   │   └── signup/             # Página de registro
│   ├── components/             # Componentes React
│   │   ├── inbox/              # Componentes del inbox
│   │   └── settings/           # Componentes de configuración
│   ├── lib/                    # Utilidades
│   │   ├── supabase/           # Clientes Supabase
│   │   ├── crypto/             # Cifrado/HMAC
│   │   ├── n8n/                # Cliente n8n
│   │   └── auth/               # Helpers de autenticación
│   └── types/                  # Tipos TypeScript
├── supabase-schema.sql         # Schema de la base de datos
├── n8n-contracts.md            # Documentación de contratos n8n
└── n8n-workflow-example.json   # Ejemplo de workflow n8n
```

## API Endpoints

### Mensajes
- `POST /api/messages/inbound` - Entrada de mensajes desde canales

### Conversaciones
- `GET /api/conversations` - Listar conversaciones
- `GET /api/conversations/[id]` - Detalle de conversación
- `POST /api/conversations/[id]/send` - Enviar mensaje

### Jobs IA
- `POST /api/jobs` - Crear job de análisis
- `GET /api/jobs/[id]` - Estado del job

### Webhooks
- `POST /api/webhooks/n8n` - Callback desde n8n (firmado HMAC)

### Canales
- `POST /api/channels/connect/[channel]` - Conectar canal

### Equipo
- `GET /api/team` - Listar miembros del equipo

### Estilo
- `POST /api/style-profiles` - Crear perfil de estilo

## Flujo de Trabajo

1. **Mensaje entrante**: Un mensaje llega desde Instagram/WhatsApp/Email
2. **Ingestión**: El backend guarda el mensaje y crea un job IA
3. **Análisis n8n**: n8n analiza el mensaje con IA (intención, urgencia, sentimiento, resumen)
4. **Respuesta sugerida**: n8n genera una respuesta adaptada al estilo del equipo
5. **Callback**: n8n envía el resultado al backend (firmado HMAC)
6. **UI**: El frontend muestra la sugerencia y el usuario decide enviar o modificar

## Seguridad

- **Firma HMAC**: Todos los webhooks usan HMAC-SHA256 con timestamp
- **RLS**: Row Level Security en Supabase para control de acceso por workspace
- **Cifrado**: Tokens de canales cifrados con AES-256-GCM
- **Idempotencia**: Prevención de duplicados y sobrescritura de jobs cerrados

## Desarrollo

### Linting
```bash
npm run lint
```

### Build
```bash
npm run build
```

### Producción
Despliega en Vercel conectando tu repositorio. Asegúrate de configurar todas las variables de entorno.

## Próximos Pasos

- [ ] Integración real con Instagram Graph API
- [ ] Integración real con WhatsApp Business API
- [ ] Integración con proveedores de email (SendGrid, Mailgun, etc.)
- [ ] Mejoras en la UI del inbox
- [ ] Notificaciones en tiempo real
- [ ] Analytics y reportes
- [ ] Exportación de conversaciones

## Licencia

MIT
