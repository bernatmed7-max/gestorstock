# 📊 Configuración del Workflow n8n para Generación de Gráficos

Este documento explica cómo configurar n8n para que Gemini analice los datos del inventario y devuelva una configuración de gráfico que la aplicación puede renderizar.

---

## 🎯 Objetivo

El workflow recibe:
- **prompt**: Lo que el usuario quiere visualizar
- **inventario**: Array de objetos con las columnas de la hoja de cálculo (dinámicas)

Y devuelve un **JSON de configuración de gráfico** que Chart.js puede renderizar.

---

## 🔧 Estructura del Workflow

```
[Webhook] → [Gemini AI] → [Respond to Webhook]
```

---

## 📥 Datos que Recibe el Webhook

> ⚠️ **IMPORTANTE**: Las columnas del inventario son DINÁMICAS. 
> Dependen de lo que el usuario haya definido en su hoja de cálculo.

### Ejemplo con columnas por defecto:

```json
{
  "job_id": "uuid-del-job",
  "prompt": "Hazme una gráfica comparativa de costes entre Play y Hoja",
  "inventario": [
    {
      "Producto": "Play",
      "Stock Actual": 50,
      "Stock Mínimo": 10,
      "Stock Máximo": 100,
      "Coste Unit.": 10
    },
    {
      "Producto": "Hoja",
      "Stock Actual": 200,
      "Stock Mínimo": 50,
      "Stock Máximo": 500,
      "Coste Unit.": 1
    }
  ],
  "callback_url": "http://localhost:3000/api/webhooks/n8n"
}
```

### Ejemplo con columnas personalizadas:

```json
{
  "job_id": "uuid-del-job",
  "prompt": "Compara las ventas por región",
  "inventario": [
    { "Región": "Norte", "Ventas": 15000, "Objetivo": 20000 },
    { "Región": "Sur", "Ventas": 22000, "Objetivo": 18000 },
    { "Región": "Este", "Ventas": 12000, "Objetivo": 15000 }
  ],
  "callback_url": "http://localhost:3000/api/webhooks/n8n"
}
```

---

## 📤 Formato de Respuesta Esperado

El nodo "Respond to Webhook" debe devolver este formato:

```json
{
  "chart_config": {
    "type": "bar",
    "title": "Stock Actual vs Stock Ideal",
    "labels": ["Producto A", "Producto B"],
    "datasets": [
      {
        "label": "Stock Actual",
        "data": [50, 15],
        "backgroundColor": "rgba(99, 102, 241, 0.8)"
      },
      {
        "label": "Stock Ideal",
        "data": [40, 40],
        "backgroundColor": "rgba(139, 92, 246, 0.8)"
      }
    ],
    "description": "Comparación del stock actual con el nivel ideal por producto"
  },
  "message": "He generado un gráfico de barras comparando el stock actual con el ideal. Puedes ver que Producto B está por debajo del nivel ideal."
}
```

---

## 🎨 Tipos de Gráficos Soportados

| Tipo | Descripción |
|------|-------------|
| `bar` | Gráfico de barras verticales |
| `line` | Gráfico de líneas |
| `pie` | Gráfico circular |
| `doughnut` | Gráfico de donut |
| `radar` | Gráfico de radar |
| `polarArea` | Área polar |

---

## 🤖 Prompt para Gemini

En el nodo de Gemini, usa un prompt del sistema como este:

```
Eres un asistente de visualización de datos para un sistema de gestión de inventario.

Tu tarea es analizar los datos proporcionados y generar configuraciones de gráficos en JSON basadas en lo que el usuario solicite.

IMPORTANTE: Siempre responde ÚNICAMENTE con JSON válido, sin explicaciones adicionales ni bloques de código.

El formato de respuesta debe ser:
{
  "chart_config": {
    "type": "bar|line|pie|doughnut|radar|polarArea",
    "title": "Título descriptivo del gráfico",
    "labels": ["etiqueta1", "etiqueta2", ...],
    "datasets": [
      {
        "label": "Nombre del dataset",
        "data": [valor1, valor2, ...],
        "backgroundColor": "#color" (opcional)
      }
    ],
    "description": "Breve descripción de lo que muestra el gráfico" (opcional)
  },
  "message": "Explicación amigable para el usuario de lo que muestra el gráfico"
}

REGLAS:
1. Los valores en "data" deben ser números EXTRAÍDOS del inventario proporcionado
2. Los "labels" deben corresponder a los nombres/valores de una columna del inventario
3. Elige el tipo de gráfico más apropiado para lo que el usuario solicita
4. Si el usuario pide algo vago, usa un gráfico de barras por defecto
5. Extrae los datos REALES del inventario, NUNCA inventes números
6. Las columnas del inventario son DINÁMICAS - examina los datos para saber qué campos tienen

CÓMO ANALIZAR EL INVENTARIO:
- El inventario es un array de objetos JSON
- Cada objeto representa una fila de la hoja de cálculo
- Las claves del objeto son los nombres de las columnas
- Usa los nombres de columnas exactamente como aparecen en los datos

EJEMPLO DE ANÁLISIS:
Si recibes: [{"Producto": "Play", "Coste": 10}, {"Producto": "Hoja", "Coste": 1}]
Y el usuario pide: "Compara costes"
Entonces usa "Producto" como labels y "Coste" como datos.
```

---

## 📝 Ejemplo de Mensaje del Usuario

```
Input: "Muéstrame qué productos necesitan reposición"
```

### Respuesta esperada de Gemini:

```json
{
  "chart_config": {
    "type": "bar",
    "title": "Productos con Stock Bajo",
    "labels": ["Producto B", "Producto D"],
    "datasets": [
      {
        "label": "Stock Actual",
        "data": [15, 8],
        "backgroundColor": "rgba(239, 68, 68, 0.8)"
      },
      {
        "label": "Stock Mínimo",
        "data": [20, 25],
        "backgroundColor": "rgba(234, 179, 8, 0.8)"
      }
    ],
    "description": "Productos que están por debajo del stock mínimo"
  },
  "message": "He identificado 2 productos que necesitan reposición urgente: Producto B y Producto D están por debajo del nivel mínimo de stock."
}
```

---

## ✅ Configuración del Nodo "Respond to Webhook"

1. **Response Code**: 200
2. **Response Body**: Expression
3. **Expression**: `{{ $json }}`  (o el objeto JSON que construyas)

---

## 🔗 URL del Webhook

```
https://n8n-n8n.hzmhls.easypanel.host/webhook/stock
```

---

## 📦 Paleta de Colores Recomendada

```javascript
const colors = {
  primary: "rgba(99, 102, 241, 0.8)",   // Indigo
  purple: "rgba(139, 92, 246, 0.8)",    // Purple
  pink: "rgba(236, 72, 153, 0.8)",      // Pink
  green: "rgba(34, 197, 94, 0.8)",      // Green (alto stock)
  yellow: "rgba(234, 179, 8, 0.8)",     // Yellow (correcto)
  red: "rgba(239, 68, 68, 0.8)",        // Red (bajo stock)
  blue: "rgba(14, 165, 233, 0.8)",      // Sky
};
```

---

## 🚀 Prueba Rápida

Para probar que funciona, configura Gemini para que siempre devuelva este JSON de prueba:

```json
{
  "chart_config": {
    "type": "bar",
    "title": "Prueba de Gráfico",
    "labels": ["A", "B", "C"],
    "datasets": [
      {
        "label": "Valores",
        "data": [10, 20, 30]
      }
    ]
  },
  "message": "¡El sistema de gráficos está funcionando correctamente! 🎉"
}
```
