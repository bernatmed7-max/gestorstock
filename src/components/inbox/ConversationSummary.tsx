interface AIOutput {
    summary?: string;
    intent?: string;
    urgency?: string;
    sentiment?: string;
}

export function ConversationSummary({ aiOutput }: { aiOutput: AIOutput }) {
    if (!aiOutput?.summary) {
        return null;
    }

    const getUrgencyColor = (urgency?: string) => {
        switch (urgency) {
            case 'critica':
                return 'bg-[#3a1a1a] text-red-400';
            case 'alta':
                return 'bg-[#3a2a1a] text-orange-400';
            case 'media':
                return 'bg-[#3a3a1a] text-yellow-400';
            default:
                return 'bg-[#262626] text-[#a3a3a3]';
        }
    };

    const getSentimentEmoji = (sentiment?: string) => {
        switch (sentiment) {
            case 'positivo':
                return '😊';
            case 'negativo':
                return '😞';
            default:
                return '😐';
        }
    };

    return (
        <div className="bg-[#1a1a1a] border-t border-[#262626] p-4">
            <div className="flex items-start gap-3">
                <div className="text-[#a3a3a3]">📋</div>
                <div className="flex-1">
                    <h4 className="text-sm font-medium text-[#e5e5e5] mb-2">Resumen de la conversación</h4>
                    <p className="text-sm text-[#a3a3a3] mb-3 leading-relaxed">{aiOutput.summary}</p>
                    <div className="flex gap-2 flex-wrap">
                        {aiOutput.intent && (
                            <span className="text-xs px-2 py-1 rounded bg-[#1e3a5f] text-[#60a5fa]">
                                {aiOutput.intent}
                            </span>
                        )}
                        {aiOutput.urgency && (
                            <span className={`text-xs px-2 py-1 rounded ${getUrgencyColor(aiOutput.urgency)}`}>
                                {aiOutput.urgency}
                            </span>
                        )}
                        {aiOutput.sentiment && (
                            <span className="text-xs px-2 py-1 rounded bg-[#262626] text-[#a3a3a3]">
                                {getSentimentEmoji(aiOutput.sentiment)} {aiOutput.sentiment}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
