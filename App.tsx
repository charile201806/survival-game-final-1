
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Radio, RefreshCw, Trash2, Zap, Lock, LogOut, Share2, Link as LinkIcon, Cloud, CloudOff, Wifi, AlertCircle, RotateCcw, Clock, Signal, ShieldAlert, Cpu } from 'lucide-react';
import { Player, PlayerStatus, GameStats } from './types';
import { StatsBoard } from './components/StatsBoard';
import { PlayerCard } from './components/PlayerCard';
import { LoginModal } from './components/LoginModal';
import { ShareModal } from './components/ShareModal';
import { generateBattleReport } from './services/geminiService';
import { createRoom, updateRoom, getRoomData } from './services/cloudService';

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState('');
  const [aiReport, setAiReport] = useState<string>('Z-ZONE 戰術內核已就緒。等待指令...');
  const [displayText, setDisplayText] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [roomId, setRoomId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('room') || localStorage.getItem('z-zone-active-room');
    return (id && id !== "undefined" && id !== "null") ? id : null;
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('z-zone-admin') === 'true');
  const [showLogin, setShowLogin] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // 打字機效果
  useEffect(() => {
    let i = 0;
    setDisplayText('');
    const timer = setInterval(() => {
      if (i < aiReport.length) {
        setDisplayText(prev => prev + aiReport.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [aiReport]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async (id: string) => {
    if (!id || id === "undefined" || id === "null") return false;
    setIsSyncing(true);
    try {
      const cloudData = await getRoomData(id);
      setIsSyncing(false);
      if (cloudData && Array.isArray(cloudData)) {
        setPlayers(cloudData);
        setSyncError(null);
        return true;
      }
      return false;
    } catch (e) {
      setIsSyncing(false);
      setSyncError("CONN_TIMEOUT");
      return false;
    }
  }, []);

  // 初始載入
  useEffect(() => {
    const init = async () => {
      if (roomId) {
        setAiReport(`正在連線至加密頻道 [${roomId}]...`);
        await fetchData(roomId);
      } else {
        const saved = localStorage.getItem('br-players');
        if (saved) setPlayers(JSON.parse(saved));
      }
    };
    init();
  }, [roomId, fetchData]);

  // 管理員自動同步
  useEffect(() => {
    if (isAdmin && roomId && players.length >= 0) {
      const sync = async () => {
        setIsSyncing(true);
        const success = await updateRoom(roomId, players);
        setIsSyncing(false);
        if (!success) setSyncError("SYNC_FAILED");
        else setSyncError(null);
      };
      const tid = setTimeout(sync, 2000);
      return () => clearTimeout(tid);
    }
    if (isAdmin && !roomId) {
      localStorage.setItem('br-players', JSON.stringify(players));
    }
  }, [players, isAdmin, roomId]);

  // 觀戰者自動刷新 (每 15 秒)
  useEffect(() => {
    if (!isAdmin && roomId) {
      const interval = setInterval(() => fetchData(roomId), 15000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, roomId, fetchData]);

  const stats: GameStats = useMemo(() => ({
    total: players.length,
    survivors: players.filter(p => p.status === PlayerStatus.SURVIVOR).length,
    infected: players.filter(p => p.status === PlayerStatus.INFECTED).length,
    eliminated: players.filter(p => p.status === PlayerStatus.ELIMINATED).length,
  }), [players]);

  const handleEnableSync = async () => {
    if (!isAdmin) return;
    setIsSyncing(true);
    setAiReport("正在向中央伺服器申請戰術頻寬...");
    try {
      const newId = await createRoom(players);
      if (newId) {
        setRoomId(newId);
        localStorage.setItem('z-zone-active-room', newId);
        const url = new URL(window.location.href);
        url.searchParams.set('room', newId);
        window.history.replaceState({}, '', url.toString());
        setAiReport(`頻道連結已建立。戰區 ID: ${newId}。請妥善分享。`);
      } else {
        setAiReport("建立失敗。請確認伺服器連線狀態。");
      }
    } catch (e) {
      setAiReport("連線崩潰。請稍後重試。");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (players.length === 0) return;
    setIsGeneratingReport(true);
    setAiReport("正在處理戰場元數據...");
    const report = await generateBattleReport(players);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans pb-32 relative bg-[#050505] text-white">
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} onLogin={() => { setIsAdmin(true); sessionStorage.setItem('z-zone-admin', 'true'); }} />
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} players={players} roomId={roomId} />

      {/* Top HUD */}
      <div className="fixed top-0 left-0 w-full z-50 flex justify-center p-2 pointer-events-none">
        <div className={`flex items-center gap-6 bg-black/80 backdrop-blur-md border px-5 py-2 rounded-full shadow-lg pointer-events-auto transition-colors ${syncError ? 'border-red-500 text-red-500' : 'border-gray-800'}`}>
          <div className="flex items-center gap-2 pr-4 border-r border-gray-800">
            <Clock size={12} className="text-gray-500" />
            <span className="text-[10px] font-mono tracking-widest">{currentTime.toLocaleTimeString([], { hour12: false })}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Signal size={12} className={isSyncing ? "animate-pulse text-neon-green" : "text-gray-600"} />
              <span className="text-[10px] font-mono uppercase tracking-tighter">
                {roomId ? `Channel: ${roomId}` : 'Standalone'}
              </span>
            </div>
            {isSyncing && <span className="text-[8px] bg-neon-green/10 text-neon-green px-1.5 py-0.5 rounded animate-pulse font-mono">UPLOADING...</span>}
            {syncError && <button onClick={() => roomId && fetchData(roomId)} className="text-[8px] bg-red-900 text-white px-2 py-0.5 rounded flex items-center gap-1"><AlertCircle size={8} /> RETRY</button>}
          </div>
        </div>
      </div>

      {/* Auth Button */}
      <div className="fixed top-4 right-4 z-50">
        <button 
          onClick={() => isAdmin ? (window.confirm('確定終止指揮權限？') && (setIsAdmin(false), sessionStorage.removeItem('z-zone-admin'))) : setShowLogin(true)} 
          className={`flex items-center gap-2 px-4 py-2 rounded border transition-all ${isAdmin ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-white'}`}
        >
          {isAdmin ? <LogOut size={14} /> : <Lock size={14} />}
          <span className="text-[10px] font-mono font-bold">{isAdmin ? 'CMD EXIT' : 'LOGIN'}</span>
        </button>
      </div>

      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-6 mt-12">
        <div className="relative">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-800 italic tracking-tighter leading-none select-none">Z-ZONE</h1>
          <div className="absolute -bottom-2 left-0 flex items-center gap-2">
            <div className="h-1 w-12 bg-neon-green shadow-[0_0_10px_#00f0ff]"></div>
            <span className="text-[9px] font-mono text-neon-green tracking-[0.5em] uppercase font-bold">Tactical Link v2.6</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isAdmin && !roomId && (
            <button onClick={handleEnableSync} disabled={isSyncing} className="flex items-center gap-2 px-4 py-3 bg-yellow-900/20 border border-yellow-500/50 text-yellow-500 rounded font-mono text-xs hover:bg-yellow-900/40 transition-all">
              <Cloud size={14} /> ENABLE CLOUD
            </button>
          )}
          {roomId && (
            <button onClick={() => setShowShare(true)} className="flex items-center gap-2 px-4 py-3 bg-neon-green/10 border border-neon-green/50 text-neon-green rounded font-mono text-xs hover:bg-neon-green/20 transition-all">
              <Share2 size={14} /> SHARE
            </button>
          )}
          <button onClick={handleGenerateReport} disabled={isGeneratingReport || players.length === 0} className="flex items-center gap-2 px-4 py-3 bg-blue-900/30 border border-blue-500/50 text-blue-300 rounded font-mono text-xs hover:bg-blue-800/50 transition-all shadow-lg shadow-blue-500/10">
            <Cpu size={14} className={isGeneratingReport ? "animate-spin" : ""} /> TACTICAL AI
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Terminal Window */}
        <div className="mb-12 bg-black border border-gray-800 rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-gray-900/50 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            </div>
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Main Console Output</span>
          </div>
          <div className="p-6 md:p-8 min-h-[120px]">
            <p className="font-mono text-lg md:text-2xl leading-relaxed text-gray-200">
              <span className="text-neon-green mr-3 animate-pulse">#</span>
              {displayText}
              <span className="inline-block w-2.5 h-5 bg-neon-green ml-1 animate-pulse"></span>
            </p>
          </div>
        </div>

        <StatsBoard stats={stats} />

        {isAdmin && (
          <form onSubmit={(e) => { e.preventDefault(); if(newName.trim()) { setPlayers(p => [{id: crypto.randomUUID(), name: newName.trim(), status: PlayerStatus.SURVIVOR, joinedAt: Date.now(), statusChangedAt: Date.now()}, ...p]); setNewName(''); } }} className="mb-12 flex gap-2">
            <input 
              type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="輸入單位代號..."
              className="flex-1 bg-gray-900 border border-gray-800 rounded p-4 text-xl focus:border-neon-green outline-none font-mono"
            />
            <button type="submit" className="bg-neon-green text-black font-black px-8 rounded flex items-center gap-2 hover:bg-white transition-colors active:scale-95">
              <Plus size={24} /> <span className="hidden sm:inline">部署</span>
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {players.map(player => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              onStatusChange={(id, status) => setPlayers(prev => prev.map(p => p.id === id ? {...p, status, statusChangedAt: Date.now()} : p))}
              onDelete={id => window.confirm('確定移除？') && setPlayers(p => p.filter(pl => pl.id !== id))}
              readOnly={!isAdmin} 
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;
