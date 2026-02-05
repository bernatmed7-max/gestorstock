import { useState, useEffect } from 'react';
import { X, Check, ChevronDown, ChevronRight, Wand2 } from 'lucide-react'; // Assuming you have lucide-react, if not standard svg icons

interface StyleProfileWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

const TONES = [
    { id: 'friendly', label: 'Amigable', description: 'Cercano y amable' },
    { id: 'professional', label: 'Profesional', description: 'Formal y serio' },
    { id: 'enthusiastic', label: 'Entusiasta', description: 'Con mucha energía' },
    { id: 'empathetic', label: 'Empático', description: 'Comprensivo y calmado' },
    { id: 'concise', label: 'Conciso', description: 'Directo al grano' },
    { id: 'detailed', label: 'Detallado', description: 'Explicativo' },
    { id: 'persuasive', label: 'Persuasivo', description: 'Orientado a venta' },
    { id: 'formal', label: 'Formal', description: 'Usted, respeto' }
];

const RESTRICTIONS = [
    { id: 'no_discounts', label: 'No ofrecer descuentos', text: 'No tienes autorización para ofrecer descuentos o promociones fuera de las oficiales.' },
    { id: 'no_dates', label: 'No prometer fechas exactas', text: 'No prometas fechas de entrega exactas; da estimaciones.' },
    { id: 'no_competitors', label: 'No mencionar competencia', text: 'Evita mencionar o comparar con productos de la competencia.' },
    { id: 'no_personal', label: 'No datos personales', text: 'No pidas ni guardes información financiera sensible por este chat.' },
    { id: 'no_slang', label: 'No usar jerga', text: 'Evita usar jerga técnica compleja o palabras ofensivas.' }
];

export default function StyleProfileWizard({ isOpen, onClose }: StyleProfileWizardProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        agentName: '',
        role: 'Ventas',
        selectedTones: [] as string[],
        customTone: '',
        objective: '',
        keyInfo: '',
        selectedRestrictions: [] as string[],
        customRestrictions: '',
    });

    const [finalPrompt, setFinalPrompt] = useState('');

    // Toggle Multi-select
    const toggleSelection = (list: string[], item: string, field: 'selectedTones' | 'selectedRestrictions') => {
        const newSet = new Set(list);
        if (newSet.has(item)) newSet.delete(item);
        else newSet.add(item);
        setFormData({ ...formData, [field]: Array.from(newSet) });
    };

    if (!isOpen) return null;

    const totalSteps = 4;

    const generateSystemPrompt = () => {
        const tones = [...formData.selectedTones.map(t => TONES.find(x => x.id === t)?.label), formData.customTone].filter(Boolean).join(', ');
        const restrictionsText = [
            ...formData.selectedRestrictions.map(r => RESTRICTIONS.find(x => x.id === r)?.text),
            formData.customRestrictions
        ].filter(Boolean).join('\n- ');

        return `Eres ${formData.agentName || '[NOMBRE]'}, un agente de ${formData.role}.
Tu tono de voz es: ${tones || '[No definido]'}.

TU OBJETIVO PRINCIPAL:
${formData.objective || '[Define el objetivo principal]'}

INFORMACIÓN CLAVE:
${formData.keyInfo || '[Información sobre productos, servicios o empresa]'}

RESTRICCIONES (LO QUE NO DEBES HACER):
${restrictionsText ? '- ' + restrictionsText : '[Sin restricciones específicas]'}

INSTRUCCIONES ADICIONALES:
Responde siempre de manera concisa y útil, siguiendo estrictamente este perfil.`;
    };



    const handleNext = () => {
        if (step === 3) {
            // Generate prompt when moving to step 4
            setFinalPrompt(generateSystemPrompt());
        }
        if (step < totalSteps) setStep(step + 1);
        else handleSubmit();
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Use finalPrompt if available (Step 4), otherwise generate it
            const promptToSend = step === 4 ? finalPrompt : generateSystemPrompt();

            const response = await fetch('/api/n8n/create-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, systemPrompt: promptToSend }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create agent');
            }

            alert('Agente creado exitosamente');
            onClose();
        } catch (error: any) {
            console.error('Error creating agent:', error);
            alert(`Error al crear agente: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-6xl h-[85vh] flex overflow-hidden shadow-2xl">

                {/* LEFT COLUMN: Configuration Form */}
                <div className="w-1/2 flex flex-col border-r border-[#262626]">
                    {/* Header */}
                    <div className="p-6 border-b border-[#262626] bg-[#1a1a1a]">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="bg-blue-600 w-6 h-6 rounded flex items-center justify-center text-xs">AI</span>
                            Configurador de Agente
                        </h2>
                        <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                            {[1, 2, 3, 4].map(s => (
                                <div key={s} className={`flex items-center gap-2 ${step >= s ? 'text-blue-500' : ''}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === s ? 'bg-blue-500/20 border-blue-500 text-blue-500' : (step > s ? 'bg-blue-500 text-black border-blue-500' : 'border-gray-600')}`}>
                                        {step > s ? '✓' : s}
                                    </div>
                                    <span className={step === s ? 'text-white font-medium' : ''}>
                                        {s === 1 ? 'Identidad' : s === 2 ? 'Comportamiento' : s === 3 ? 'Conocimiento' : 'Preview'}
                                    </span>
                                    {s < 4 && <div className="w-8 h-[1px] bg-[#262626]" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Form Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#151515]">
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Nombre del Agente</label>
                                    <input
                                        type="text"
                                        value={formData.agentName}
                                        onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-gray-700"
                                        placeholder="Ej. Ana, Asistente de Ventas..."
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Rol Principal</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="Ventas">Ventas y Cierre</option>
                                        <option value="Soporte Técnico">Soporte Técnico</option>
                                        <option value="Atención al Cliente">Atención al Cliente (General)</option>
                                        <option value="Asesor Personal">Asesor Personal / Coach</option>
                                        <option value="Reservas">Gestor de Reservas</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Objetivo del Agente</label>
                                    <textarea
                                        value={formData.objective}
                                        onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-white h-32 focus:border-blue-500 focus:outline-none resize-none"
                                        placeholder="Describe qué debe lograr el agente. Ej: Responder dudas sobre precios y conseguir que el usuario agende una demo."
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-3">Tono y Personalidad</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {TONES.map(tone => (
                                            <div
                                                key={tone.id}
                                                onClick={() => toggleSelection(formData.selectedTones, tone.id, 'selectedTones')}
                                                className={`cursor-pointer p-3 rounded-lg border transition-all flex items-start gap-3 ${formData.selectedTones.includes(tone.id) ? 'bg-blue-500/10 border-blue-500' : 'bg-[#0a0a0a] border-[#333] hover:border-gray-500'}`}
                                            >
                                                <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${formData.selectedTones.includes(tone.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                                                    {formData.selectedTones.includes(tone.id) && <span className="text-black text-[10px] font-bold">✓</span>}
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-medium ${formData.selectedTones.includes(tone.id) ? 'text-blue-400' : 'text-gray-300'}`}>{tone.label}</div>
                                                    <div className="text-xs text-gray-500">{tone.description}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4">
                                        <input
                                            type="text"
                                            value={formData.customTone}
                                            onChange={(e) => setFormData({ ...formData, customTone: e.target.value })}
                                            className="w-full bg-transparent border-b border-[#333] py-2 text-sm text-white focus:border-blue-500 focus:outline-none placeholder:text-gray-700"
                                            placeholder="+ Añadir tono personalizado..."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-3">Fuentes de Conocimiento</label>
                                    <p className="text-xs text-gray-400 mb-4">Añade webs o archivos para que la IA aprenda sobre tu negocio.</p>

                                    {/* URL Input */}
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            id="urlInput"
                                            placeholder="https://tunsitio.com/sobre-nosotros"
                                            className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg p-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                                        />
                                        <button
                                            onClick={async () => {
                                                const input = document.getElementById('urlInput') as HTMLInputElement;
                                                const url = input.value;
                                                if (!url) return;

                                                const btn = document.getElementById('addUrlBtn') as HTMLButtonElement;
                                                const originalText = btn.innerText;
                                                btn.innerText = '...';
                                                btn.disabled = true;

                                                try {
                                                    const formData = new FormData();
                                                    formData.append('type', 'url');
                                                    formData.append('url', url);

                                                    const res = await fetch('/api/ai/extract', { method: 'POST', body: formData });
                                                    const data = await res.json();

                                                    if (data.success) {
                                                        const newInfo = `\n\n--- INFORMACIÓN DE: ${url} ---\n${data.text}`;
                                                        setFormData(prev => ({ ...prev, keyInfo: prev.keyInfo + newInfo }));
                                                        input.value = '';
                                                    } else {
                                                        alert('Error: ' + data.error);
                                                    }
                                                } catch (e) { console.error(e); alert('Error al procesar URL'); }
                                                finally {
                                                    btn.innerText = originalText;
                                                    btn.disabled = false;
                                                }
                                            }}
                                            id="addUrlBtn"
                                            className="bg-[#262626] hover:bg-[#333] text-white px-4 rounded-lg text-sm border border-[#404040]"
                                        >
                                            Añadir URL
                                        </button>
                                    </div>

                                    {/* File Upload */}
                                    <div className="mb-4">
                                        <label className="flex items-center justify-center w-full h-24 border-2 border-[#333] border-dashed rounded-lg cursor-pointer bg-[#0a0a0a] hover:bg-[#111] hover:border-blue-500/50 transition-colors group">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <p className="mb-2 text-sm text-gray-400 group-hover:text-blue-400"><span className="font-semibold">Click para subir</span> o arrastra archivo</p>
                                                <p className="text-xs text-gray-500">PDF, Excel, CSV, TXT</p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.csv,.xlsx,.xls,.txt"
                                                onChange={async (e) => {
                                                    if (!e.target.files || e.target.files.length === 0) return;
                                                    const file = e.target.files[0];

                                                    // Simple toaster loading indicator would be better but simple alert for now
                                                    const originalText = e.target.parentElement?.innerText || 'Subiendo...';

                                                    try {
                                                        const formData = new FormData();
                                                        formData.append('type', 'file');
                                                        formData.append('file', file);

                                                        const res = await fetch('/api/ai/extract', { method: 'POST', body: formData });
                                                        const data = await res.json();

                                                        if (data.success) {
                                                            const newInfo = `\n\n--- INFORMACIÓN DE ARCHIVO: ${file.name} ---\n${data.text}`;
                                                            setFormData(prev => ({ ...prev, keyInfo: prev.keyInfo + newInfo }));
                                                        } else {
                                                            alert('Error: ' + data.error);
                                                        }
                                                    } catch (err) { console.error(err); alert('Error al subir archivo'); }
                                                }}
                                            />
                                        </label>
                                    </div>

                                    <label className="block text-sm font-medium text-white mb-2">Base de Conocimiento (Editable)</label>
                                    <textarea
                                        value={formData.keyInfo}
                                        onChange={(e) => setFormData({ ...formData, keyInfo: e.target.value })}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-white h-48 focus:border-blue-500 focus:outline-none text-sm font-mono"
                                        placeholder="La información extraída de URLs y archivos aparecerá aquí. Puedes editarla o añadir texto manualmente."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white mb-3">Restricciones y Reglas</label>
                                    <div className="space-y-2">
                                        {RESTRICTIONS.map(res => (
                                            <div
                                                key={res.id}
                                                onClick={() => toggleSelection(formData.selectedRestrictions, res.id, 'selectedRestrictions')}
                                                className={`cursor-pointer p-3 rounded-lg border transition-all flex items-center gap-3 ${formData.selectedRestrictions.includes(res.id) ? 'bg-red-500/10 border-red-500' : 'bg-[#0a0a0a] border-[#333] hover:border-gray-500'}`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.selectedRestrictions.includes(res.id) ? 'bg-red-500 border-red-500' : 'border-gray-600'}`}>
                                                    {formData.selectedRestrictions.includes(res.id) && <span className="text-white text-[10px] font-bold">✕</span>}
                                                </div>
                                                <div className="text-sm text-gray-300">{res.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4">
                                        <textarea
                                            value={formData.customRestrictions}
                                            onChange={(e) => setFormData({ ...formData, customRestrictions: e.target.value })}
                                            className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-white text-sm h-20 focus:border-red-500 focus:outline-none"
                                            placeholder="Otras reglas o restricciones específicas..."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-3">Previsualización y Edición del Prompt</label>
                                    <p className="text-xs text-gray-400 mb-4">
                                        Revisa y edita el prompt final que se enviará al Agente. Cualquier cambio aquí será definitivo.
                                    </p>
                                    <textarea
                                        value={finalPrompt}
                                        onChange={(e) => setFinalPrompt(e.target.value)}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-4 text-white font-mono text-sm leading-relaxed h-[50vh] focus:border-blue-500 focus:outline-none resize-none"
                                        placeholder="Prompt generado..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-[#262626] bg-[#1a1a1a] flex justify-between items-center">
                        <button
                            onClick={handleBack}
                            disabled={step === 1}
                            className={`px-4 py-2 text-gray-400 hover:text-white transition-colors ${step === 1 ? 'opacity-0' : ''}`}
                        >
                            Atrás
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center gap-2"
                            >
                                {loading ? 'Guardando...' : step === totalSteps ? 'Crear Agente' : 'Siguiente'}
                                {!loading && step < totalSteps && <span>→</span>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Live Preview */}
                <div className="w-1/2 bg-[#050505] flex flex-col">
                    <div className="p-4 border-b border-[#262626] bg-[#0a0a0a] flex justify-between items-center">
                        <h3 className="text-sm font-mono text-gray-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            PROMPT PREVIEW
                        </h3>
                        <div className="text-xs text-gray-600">Actualización en tiempo real</div>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                            <div className="relative bg-[#0a0a0a] rounded-lg border border-[#333] p-6 font-mono text-sm leading-relaxed text-gray-300 shadow-2xl">
                                <pre className="whitespace-pre-wrap font-mono text-[#a3a3a3]">
                                    {generateSystemPrompt()}
                                </pre>

                                <div className="mt-4 pt-4 border-t border-[#262626] flex items-center justify-between text-xs text-gray-500">
                                    <span>Tokens estimados: ~{Math.ceil(generateSystemPrompt().length / 4)}</span>
                                    <span>Modelo: GPT-4o / Claude 3.5</span>
                                </div>
                            </div>
                        </div>

                        {/* Visual Helper / Tips */}
                        <div className="mt-8 p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                            <h4 className="text-blue-400 text-xs font-bold uppercase mb-2">💡 Pro Tip</h4>
                            <p className="text-gray-400 text-xs">
                                Cuanto más específico seas en la sección de "Restricciones" y "Objetivo", más consistente será el agente. Usa el campo de "Instrucciones personalizadas" para definir casos borde.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
