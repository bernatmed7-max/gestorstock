# 📊 Sincronización con Google Sheets

Esta guía explica cómo configurar n8n para sincronizar automáticamente datos desde Google Sheets a la aplicación.

---

## 🔧 Arquitectura

```
[Google Sheets] 
    ↓ (cada X minutos)
[n8n: Schedule + Google Sheets node]
    ↓ POST
[/api/sync/sheets]
    ↓
[Supabase: sheet_sync table]
    ↓ 
[Dashboard actualizado]
```

---

## 📋 Paso 1: Crear la tabla en Supabase

Ejecuta este SQL en Supabase (ya está en `supabase-schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS sheet_sync (
  id TEXT PRIMARY KEY DEFAULT 'default',
  sheet_id TEXT,
  headers JSONB,
  rows JSONB,
  row_count INT DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sheet_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sheet_sync" ON sheet_sync
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage sheet_sync" ON sheet_sync
  FOR ALL USING (true);
```

---

## 🔄 Paso 2: Crear Workflow en n8n

### Nodos necesarios:

```
[Schedule Trigger] → [Google Sheets] → [HTTP Request]
```

### Configuración del Schedule Trigger:
- **Trigger Interval**: Every 5 minutes (o lo que prefieras)

### Configuración de Google Sheets:
- **Operation**: Read Rows
- **Document**: Tu spreadsheet
- **Sheet**: La hoja específica
- **Options**: 
  - First Row Contains Headers: Yes

### Configuración del HTTP Request:
- **Method**: POST
- **URL**: `https://tu-app.vercel.app/api/sync/sheets` (o `http://localhost:3000/api/sync/sheets` en desarrollo)
- **Body Content Type**: JSON
- **Body**:
```json
{
  "data": {{ $json }},
  "sheet_id": "mi-inventario"
}
```

O si Google Sheets devuelve un array:
```json
{
  "data": {{ $input.all() }},
  "sheet_id": "mi-inventario"
}
```

---

## 📥 Formato de Datos Esperado

### El endpoint `/api/sync/sheets` espera:

```json
{
  "sheet_id": "identificador-opcional",
  "data": [
    {
      "Nombre": "Producto A",
      "Stock": 50,
      "Precio": 15.50,
      "Categoría": "Electrónica"
    },
    {
      "Nombre": "Producto B",
      "Stock": 30,
      "Precio": 25.00,
      "Categoría": "Hogar"
    }
  ]
}
```

### La respuesta será:

```json
{
  "success": true,
  "message": "Sincronizados 2 productos",
  "columns": ["Nombre", "Stock", "Precio", "Categoría"],
  "row_count": 2,
  "synced_at": "2026-01-11T18:00:00.000Z"
}
```

---

## 🎯 Paso 3: Verificar en la App

1. La app mostrará automáticamente el componente `GoogleSheetsSync`
2. Verás las columnas dinámicas de tu hoja de cálculo
3. El indicador verde confirma la conexión activa

---

## 🔐 Seguridad (Opcional)

Para proteger el endpoint, añade un secret:

### 1. Añadir variable de entorno:
```env
SYNC_WEBHOOK_SECRET=tu-secret-aleatorio-aqui
```

### 2. Configurar en n8n:
En el HTTP Request, añade header:
```
Authorization: Bearer tu-secret-aleatorio-aqui
```

---

## 🧪 Probar Manualmente

Puedes probar el endpoint con curl:

```bash
curl -X POST http://localhost:3000/api/sync/sheets \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {"Producto": "Test A", "Stock": 100, "Precio": 10},
      {"Producto": "Test B", "Stock": 50, "Precio": 20}
    ]
  }'
```

---

## 📊 Columnas Dinámicas

**Lo mejor de este sistema es que las columnas son 100% dinámicas:**

- Si añades una columna "Color" en Google Sheets → aparece en la app
- Si eliminas la columna "Categoría" → desaparece de la app
- No necesitas modificar código cuando cambies la estructura

---

## ⏱️ Frecuencia de Sincronización

| Intervalo | Uso recomendado |
|-----------|-----------------|
| 1 minuto | Datos muy cambiantes |
| 5 minutos | Balance normal |
| 15 minutos | Datos estables |
| Manual | Bajo demanda (botón refresh) |

---

## 🆘 Troubleshooting

### Los datos no aparecen:
1. Verifica que la tabla `sheet_sync` existe en Supabase
2. Revisa los logs de n8n
3. Prueba el endpoint manualmente con curl

### Error de autenticación:
1. Verifica el `SYNC_WEBHOOK_SECRET` si lo configuraste
2. El header debe ser `Authorization: Bearer <secret>`

### Columnas incorrectas:
1. Asegúrate de que Google Sheets tenga headers en la primera fila
2. Verifica que n8n está enviando todas las columnas
