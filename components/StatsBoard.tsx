import React from 'react';
import { GameStats } from '../types';
import { Users, Skull, Activity, Target } from 'lucide-react';

interface StatsBoardProps {
  stats: GameStats;
}

export const StatsBoard: React.FC<StatsBoardProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {/* Total Players */}
      <div className="bg-panel-bg border border-gray-800 p-4 rounded-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Users size={48} />
        </div>
        <h3 className="text-gray-400 text-xs uppercase font-mono tracking-widest">總人數</h3>
        <p className="text-3xl font-bold text-white font-mono mt-1">{stats.total}</p>
      </div>

      {/* Survivors */}
      <div className="bg-panel-bg border border-gray-800 border-l-4 border-l-neon-green p-4 rounded-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity text-neon-green">
          <Activity size={48} />
        </div>
        <h3 className="text-neon-green text-xs uppercase font-mono tracking-widest">倖存者</h3>
        <p className="text-3xl font-bold text-white font-mono mt-1">{stats.survivors}</p>
      </div>

      {/* Infected */}
      <div className="bg-panel-bg border border-gray-800 border-l-4 border-l-neon-red p-4 rounded-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity text-neon-red">
          <Skull size={48} />
        </div>
        <h3 className="text-neon-red text-xs uppercase font-mono tracking-widest">已感染</h3>
        <p className="text-3xl font-bold text-white font-mono mt-1">{stats.infected}</p>
      </div>

       {/* Eliminated */}
       <div className="bg-panel-bg border border-gray-800 border-l-4 border-l-gray-500 p-4 rounded-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity text-gray-500">
          <Target size={48} />
        </div>
        <h3 className="text-gray-500 text-xs uppercase font-mono tracking-widest">已淘汰</h3>
        <p className="text-3xl font-bold text-white font-mono mt-1">{stats.eliminated}</p>
      </div>
    </div>
  );
};