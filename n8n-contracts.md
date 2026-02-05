# Contratos n8n - Social CRM

## Entrada (Input) - Webhook desde App

### Endpoint
`POST {N8N_WEBHOOK_URL}`

### Headers
```
Content-Type: application/json
X-Signature: {HMAC-SHA256 hex}
X-Timestamp: {ISO 8601 timestamp}
```

### Body (JSON)
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "workspace_id": "660e8400-e29b-41d4-a716-446655440000",
  "user_id": "770e8400-e29b-41d4-a716-446655440000",
  "channel": "whatsapp_business",
  "channel_account_id": "1234567890",
  "conversation_external_id": "conv_abc123",
  "message_external_id": "msg_xyz789",
  "contact_external_id": "contact_123",
  "direction": "in",
  "text": "Hola, me interesa conocer más sobre sus productos",
  "attachments": [
    {
      "name": "imagen.jpg",
      "type": "image/jpeg",
      "size": 1024000,
      "url": "https://example.com/files/imagen.jpg"
    }
  ],
  "timestamp": "2026-01-15T10:30:00Z",
  "context": {
    "last_messages": [
      {
        "direction": "out",
        "text": "Bienvenido a nuestro servicio",
        "timestamp": "2026-01-15T10:25:00Z"
      },
      {
        "direction": "in",
        "text": "Gracias",
        "timestamp": "2026-01-15T10:26:00Z"
      }
    ],
    "language_detected": "es",
    "style_profile_id": "880e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Validaciones en n8n
1. **Firma HMAC**: Verificar `X-Signature` usando `N8N_WEBHOOK_SECRET`
   - Mensaje: `{timestamp}.{JSON body}`
   - Algoritmo: HMAC-SHA256
   - Ventana de tiempo: ±5 minutos

2. **Campos obligatorios**:
   - `job_id`, `channel`, `message_external_id`, `conversation_external_id`

3. **Validación de contenido**:
   - `text` o `attachments` debe existir
   - `text` máximo 10,000 caracteres
   - `attachments`: máximo 20 MB por archivo
   - Tipos permitidos: imágenes, PDF, audio, video comunes

4. **Deduplicación**:
   - Verificar si `message_external_id` ya fue procesado (opcional: consultar backend)

## Salida (Output) - Callback al Backend

### Endpoint
`POST {APP_BASE_URL}/api/webhooks/n8n`

### Headers
```
Content-Type: application/json
X-Signature: {HMAC-SHA256 hex}
X-Timestamp: {ISO 8601 timestamp}
```

### Body (JSON) - Caso: completed
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "output": {
    "intent": "venta",
    "urgency": "media",
    "sentiment": "positivo",
    "summary": "Cliente interesado en conocer productos. Muestra intención de compra.",
    "suggested_reply": "¡Hola! Me alegra saber que te interesan nuestros productos. Te puedo ayudar a encontrar lo que necesitas. ¿Qué tipo de producto estás buscando?",
    "confidence": 0.85,
    "language": "es",
    "entities": {
      "nombre": null,
      "empresa": null,
      "email": null,
      "telefono": "+1234567890",
      "presupuesto": null,
      "fecha": null
    },
    "routing": {
      "recommended_role": "agent",
      "priority": 5,
      "auto_send_recommended": false
    }
  },
  "meta": {
    "n8n_execution_id": "exec_123456",
    "model": "gpt-4o",
    "prompt_version": "1.0",
    "latency_ms": 1250
  }
}
```

### Body (JSON) - Caso: failed
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": {
    "code": "LLM_TIMEOUT",
    "message": "Timeout al llamar al modelo de IA",
    "details": {
      "retry_count": 3,
      "last_error": "Request timeout after 30s"
    }
  },
  "meta": {
    "n8n_execution_id": "exec_123456",
    "model": "gpt-4o",
    "prompt_version": "1.0",
    "latency_ms": 30000
  }
}
```

### Body (JSON) - Caso: running (status update)
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "meta": {
    "n8n_execution_id": "exec_123456",
    "model": "gpt-4o",
    "prompt_version": "1.0",
    "latency_ms": 500
  }
}
```

## Workflow n8n - Diseño

### Nodos sugeridos:

1. **Webhook Trigger**
   - Método: POST
   - Path: `/webhook/message-analysis`
   - Response: JSON

2. **Verify Signature** (Code Node)
   ```javascript
   const crypto = require('crypto');
   const secret = $env.N8N_WEBHOOK_SECRET;
   const timestamp = $input.item.json.headers['x-timestamp'];
   const signature = $input.item.json.headers['x-signature'];
   const body = JSON.stringify($input.item.json.body);
   
   const message = `${timestamp}.${body}`;
   const hmac = crypto.createHmac('sha256', secret);
   hmac.update(message);
   const expectedSignature = hmac.digest('hex');
   
   if (signature !== expectedSignature) {
     throw new Error('Invalid signature');
   }
   
   // Check timestamp (within 5 minutes)
   const timestampDate = new Date(timestamp);
   const now = new Date();
   const diffMinutes = Math.abs(now - timestampDate) / 60000;
   if (diffMinutes > 5) {
     throw new Error('Timestamp expired');
   }
   
   return { valid: true, data: $input.item.json.body };
   ```

3. **Validate Input** (IF Node)
   - Campos obligatorios presentes
   - Texto o adjunto existe
   - Límites de tamaño

4. **Idempotency Check** (HTTP Request - opcional)
   - GET al backend para verificar si `message_external_id` ya existe
   - Si existe, retornar early con status `completed` (duplicado)

5. **Get Style Profile** (HTTP Request - opcional)
   - Si `style_profile_id` existe, obtener el perfil desde el backend
   - Usar `prompt_template` y `training_samples` para personalizar

6. **LLM: Classify & Summarize** (OpenAI/Anthropic Node)
   - Prompt:
     ```
     Analiza el siguiente mensaje y contexto:
     
     Mensaje: {text}
     Canal: {channel}
     Últimos mensajes: {last_messages}
     
     Proporciona:
     1. Intención: venta | soporte | informacion | otro
     2. Urgencia: baja | media | alta | critica
     3. Sentimiento: positivo | neutro | negativo
     4. Resumen: 1-2 frases
     5. Entidades extraídas: nombre, empresa, email, teléfono, presupuesto, fecha
     6. Idioma detectado
     
     Responde en JSON con esta estructura:
     {
       "intent": "...",
       "urgency": "...",
       "sentiment": "...",
       "summary": "...",
       "language": "...",
       "entities": {...}
     }
     ```

7. **LLM: Generate Suggested Reply** (OpenAI/Anthropic Node)
   - Prompt:
     ```
     Genera una respuesta sugerida para este mensaje:
     
     Mensaje del cliente: {text}
     Contexto: {summary}
     Intención: {intent}
     Sentimiento: {sentiment}
     
     {Si style_profile existe:}
     Estilo de escritura del equipo:
     {training_samples}
     
     Instrucciones de estilo:
     {prompt_template}
     
     Genera una respuesta profesional, amigable y adaptada al estilo del equipo.
     Responde solo con el texto de la respuesta sugerida.
     ```

8. **Routing Rules** (Code Node)
   ```javascript
   const intent = $input.item.json.intent;
   const urgency = $input.item.json.urgency;
   const confidence = $input.item.json.confidence;
   
   // Determine routing
   let recommendedRole = 'agent';
   let priority = 5;
   let autoSendRecommended = false;
   
   if (intent === 'venta' && confidence > 0.8) {
     recommendedRole = 'admin';
     priority = 8;
   } else if (urgency === 'critica') {
     recommendedRole = 'admin';
     priority = 10;
     autoSendRecommended = false; // Always manual for critical
   } else if (intent === 'soporte' && urgency === 'alta') {
     priority = 7;
   }
   
   // Auto-send only for low-urgency, high-confidence, non-critical
   if (urgency === 'baja' && confidence > 0.9 && intent !== 'venta') {
     autoSendRecommended = true;
   }
   
   return {
     ...$input.item.json,
     routing: {
       recommended_role: recommendedRole,
       priority,
       auto_send_recommended: autoSendRecommended
     }
   };
   ```

9. **Callback HTTP** (HTTP Request Node)
   - Método: POST
   - URL: `{callback_url}` (del input original)
   - Headers:
     - `Content-Type: application/json`
     - `X-Signature: {HMAC del body + timestamp}`
     - `X-Timestamp: {ISO timestamp}`
   - Body: JSON con estructura de output

10. **Error Handler** (IF Node)
    - Si algún nodo falla, enviar callback con `status: "failed"`
    - Incluir código de error y mensaje

11. **Retry Logic** (n8n Retry Node)
    - Máximo 3 reintentos
    - Backoff exponencial: 1s, 2s, 4s
    - Solo para errores transitorios (timeout, rate limit)

## Variables de entorno n8n

```
N8N_WEBHOOK_SECRET={mismo que en la app}
OPENAI_API_KEY={o ANTHROPIC_API_KEY}
APP_BASE_URL={URL del backend}
```

## Notas de implementación

1. **Idempotencia**: El workflow debe ser idempotente. Si se ejecuta dos veces con el mismo `job_id`, debe producir el mismo resultado.

2. **Reintentos**: Configurar reintentos en n8n para errores transitorios (timeout, rate limit). No reintentar para errores de validación.

3. **Logging**: Registrar `n8n_execution_id` en cada callback para trazabilidad.

4. **Performance**: El workflow debe completarse en < 30 segundos para buena UX. Si tarda más, considerar procesamiento asíncrono.

5. **Seguridad**: Nunca exponer `N8N_WEBHOOK_SECRET` en logs o respuestas.
