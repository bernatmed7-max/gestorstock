// Job Status Types
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

// Stock Status Types
export type StockStatus = 'bajo' | 'correcto' | 'alto';

// Product in Inventory
export interface Product {
  id: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  stock_ideal: number;
  stock_maximo: number;
  coste_unitario: number;
  status?: StockStatus;
}

// Job Input for Chart Generation
export interface JobInput {
  prompt: string;
  inventario: Product[];
}

// Chart Dataset for Chart.js
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

// Chart Configuration from AI
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea';
  title: string;
  labels: string[];
  datasets: ChartDataset[];
  description?: string;
}

// Job Output from n8n
export interface JobOutput {
  // Legacy image support
  image_url?: string;
  image_base64?: string;
  // New chart config support
  chart_config?: ChartConfig;
  // AI message/explanation
  message?: string;
  metadata?: {
    tipo_grafico: string;
    parametros_usados: string[];
  };
}

// Job Error
export interface JobError {
  code: string;
  message: string;
  details?: string;
}

// Job Record from Database
export interface Job {
  id: string;
  user_id: string;
  status: JobStatus;
  input: JobInput;
  output?: JobOutput;
  error?: JobError;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  n8n_execution_id?: string;
  attempts: number;
}

// User Profile
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
}

// Stock Calculation Results
export interface StockCalculation {
  total_productos: number;
  total_stock: number;
  media_coste_unitario: number;
  productos_bajo_stock: number;
  productos_stock_correcto: number;
  productos_alto_stock: number;
}

// n8n Webhook Payload
export interface N8nWebhookPayload {
  job_id: string;
  status: JobStatus;
  output?: JobOutput;
  error?: JobError;
  timestamp: string;
  signature?: string;
}

// Client/Supplier Type
export interface Client {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  cif_nif?: string;
  notas?: string;
  created_at: string;
}
