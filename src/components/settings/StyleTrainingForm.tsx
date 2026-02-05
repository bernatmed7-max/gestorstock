'use client';

import { useState } from 'react';

export function StyleTrainingForm() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [trainingSamples, setTrainingSamples] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/style-profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    training_samples: trainingSamples.split('\n').filter(s => s.trim()),
                }),
            });

            if (response.ok) {
                alert('Perfil de estilo creado exitosamente');
                setName('');
                setDescription('');
                setTrainingSamples('');
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error creating style profile:', error);
            alert('Error al crear perfil de estilo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Perfil
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Muestras de Entrenamiento (una por línea)
                </label>
                <textarea
                    value={trainingSamples}
                    onChange={(e) => setTrainingSamples(e.target.value)}
                    rows={6}
                    placeholder="Ejemplo de respuesta 1&#10;Ejemplo de respuesta 2&#10;..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
                {loading ? 'Guardando...' : 'Guardar Perfil'}
            </button>
        </form>
    );
}
