import React from 'react';
import { Player, PlayerStatus } from '../types';
import { Shield, Skull, Crosshair, UserX } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  onStatusChange: (id: string, status: PlayerStatus) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onStatusChange, onDelete, readOnly = false }) => {
  const isSurvivor = player.status === PlayerStatus.SURVIVOR;
  const isInfected = player.status === PlayerStatus.INFECTED;

  const borderColor = isSurvivor ? 'border-neon-green' : (isInfected ? 'border-neon-red' : 'border-gray-600');
  const glowClass = isSurvivor 
    ? 'shadow-[0_0_10px_rgba(0,240,255,0.1)]' 
    : (isInfected ? 'shadow-[0_0_10px_rgba(255,0,60,0.15)]' : '');

  const getStatusLabel = () => {
    switch(player.status) {
      case PlayerStatus.SURVIVOR: return '倖存者';
      case PlayerStatus.INFECTED: return '感染者';
      case PlayerStatus.ELIMINATED: return '已淘汰';
    }
  };

  return (
    <div className={`relative bg-panel-bg border-2 ${borderColor} ${glowClass} rounded-xl p-4 transition-all duration-300 flex flex-col justify-between`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xl font-bold text-white tracking-wide truncate max-w-[150px]">{player.name}</h4>
          <span className={`inline-block px-2 py-0.5 mt-1 text-xs font-mono font-bold rounded ${
            isSurvivor ? 'bg-green-900/50 text-neon-green' : (isInfected ? 'bg-red-900/50 text-neon-red' : 'bg-gray-800 text-gray-400')
          }`}>
            {getStatusLabel()}
          </span>
        </div>
        <div className={`p-2 rounded-full ${
            isSurvivor ? 'bg-green-900/20 text-neon-green' : (isInfected ? 'bg-red-900/20 text-neon-red' : 'bg-gray-800 text-gray-400')
        }`}>
          {isSurvivor && <Shield size={24} />}
          {isInfected && <Skull size={24} />}
          {player.status === PlayerStatus.ELIMINATED && <UserX size={24} />}
        </div>
      </div>

      {!readOnly && (
        <div className="grid grid-cols-3 gap-2 mt-auto">
          <button
            onClick={() => onStatusChange(player.id, PlayerStatus.SURVIVOR)}
            disabled={isSurvivor}
            className={`p-2 rounded flex justify-center items-center transition-colors ${
              isSurvivor ? 'bg-green-500/10 text-gray-500 cursor-not-allowed' : 'bg-gray-800 hover:bg-green-900/50 text-neon-green border border-gray-700 hover:border-neon-green'
            }`}
            title="標記為倖存"
          >
            <Shield size={18} />
          </button>
          <button
            onClick={() => onStatusChange(player.id, PlayerStatus.INFECTED)}
            disabled={isInfected}
            className={`p-2 rounded flex justify-center items-center transition-colors ${
              isInfected ? 'bg-red-500/10 text-gray-500 cursor-not-allowed' : 'bg-gray-800 hover:bg-red-900/50 text-neon-red border border-gray-700 hover:border-neon-red'
            }`}
            title="標記為感染"
          >
            <Skull size={18} />
          </button>
           <button
            onClick={() => onDelete(player.id)}
            className="p-2 rounded flex justify-center items-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition-colors"
            title="移除玩家"
          >
            <Crosshair size={18} />
          </button>
        </div>
      )}
      
      {/* Time display */}
      <div className="mt-3 text-[10px] font-mono text-gray-600 text-right">
        UPDATED: {new Date(player.statusChangedAt).toLocaleTimeString()}
      </div>
    </div>
  );
};