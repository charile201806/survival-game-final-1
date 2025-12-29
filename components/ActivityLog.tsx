import React from 'react';
import { GameEvent } from '../types';
import { Clock, Terminal } from 'lucide-react';

interface ActivityLogProps {
  events: GameEvent[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ events }) => {
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

  return (
    <div className="bg-panel-bg border border-gray-800 rounded-lg overflow-hidden mb-8">
      <div className="bg-gray-900/50 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
          <Terminal size={14} />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]">戰術日誌 / ACT_LOG</span>
        </div>
      </div>
      <div className="p-4 max-h-[200px] overflow-y-auto font-mono text-[11px]">
        {sortedEvents.length === 0 ? (
          <p className="text-gray-600 italic">等待數據鏈入...</p>
        ) : (
          <div className="space-y-2">
            {sortedEvents.map(event => (
              <div key={event.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-gray-600 flex-shrink-0">
                  [{new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}]
                </span>
                <span className="text-neon-green font-bold">[{event.playerName}]</span>
                <span className="text-gray-300">{event.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
