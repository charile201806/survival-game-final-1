
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Radio, RefreshCw, Trash2, Zap, Lock, LogOut, Share2, Link as LinkIcon, Cloud, CloudOff, Wifi, AlertCircle, RotateCcw, Clock, Signal, ShieldAlert } from 'lucide-react';
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
  const [aiReport, setAiReport] = useState<string>('系統初始化中... 正在建立安全連線。');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [roomId, setRoomId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('room') || localStorage.getItem('z-zone-active-room');
    return (id && id !== "undefined") ? id : null;
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('z-zone-admin') === 'true');
  const [showLogin, setShowLogin] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async (id: string) => {
    if (!id || id === "undefined") return false;
    setIsSyncing(true);
    try {
      const cloudData = await getRoomData(id);
      setIsSyncing(false);
      if (cloudData && Array.isArray(cloudData)) {
        setPlayers(cloudData);
        setLastSync(Date.now());
        setSyncError(null);
        return true;
      }
      setSyncError("數據結構異常");
      return false;
    } catch (e) {
      setIsSyncing(false);
      setSyncError("網絡通訊超時");
      return false;
    }
  }, []);

  useEffect(() => {
    const initFetch = async () => {
      if (roomId && roomId !== "undefined") {
        setAiReport(`正在擷取頻道 [${roomId}] 的實時戰術數據...`);
        const success = await fetchData(roomId);
        if (success) {
          setAiReport("連線成功。Z-ZONE 戰術指揮網絡已同步。");
        } else {
          setAiReport(`警告：無法同步頻道 [${roomId}]。請確認 ID 是否正確或伺服器是否離線。`);
        }
      } else {
        const saved = localStorage.getItem('br-players');
        if (saved) {
          setPlayers(JSON.parse(saved));
          setAiReport("載入本地緩存數據。請點擊「ENABLE CLOUD」建立共享頻道。");
        } else {
          setAiReport("歡迎進入 Z-ZONE 終端。請驗證管理員身分以解鎖戰區配置權限。");
        }
      }
    };
    initFetch();
  }, [roomId, fetchData]);

  useEffect(() => {
    if (isAdmin && roomId && roomId !== "undefined" && players.length >= 0) {
      const sync = async () => {
        setIsSyncing(true);
        const success = await updateRoom(roomId, players);
        setIsSyncing(false);
        if (success) {
          setLastSync(Date.now());
          setSyncError(null);
        } else {
          setSyncError("雲端寫入失敗");
        }
      };
      const timeoutId = setTimeout(sync, 1500);
      return () => clearTimeout(timeoutId);
    }
    if (isAdmin && (!roomId || roomId === "undefined")) {
      localStorage.setItem('br-players', JSON.stringify(players));
    }
  }, [players, isAdmin, roomId]);

  useEffect(() => {
    if (!isAdmin && roomId && roomId !== "undefined") {
      const interval = setInterval(() => fetchData(roomId), 10000);
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
    setAiReport("正在請求軍事加密頻道 ID...");
    try {
      const newId = await createRoom(players);
      if (newId) {
        setRoomId(newId);
        localStorage.setItem('z-zone-active-room', newId);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('room', newId);
        window.history.replaceState({}, '', newUrl.toString());
        setAiReport(`頻道連結建立成功！[ID: ${newId}] 廣播已開啟。`);
        setSyncError(null);
        setLastSync(Date.now());
      } else {
        setAiReport("錯誤：伺服器拒絕建立請求。請檢查網絡狀態。");
        setSyncError("連線被拒絕");
      }
    } catch (e) {
      setAiReport("致命錯誤：無法連線至中央雲端核心。");
      setSyncError("FATAL_CONN");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = () => {
    setIsAdmin(true);
    sessionStorage.setItem('z-zone-admin', 'true');
    setAiReport("管理員權限已驗證。戰術指揮權限解除鎖定。");
  };

  const handleLogout = () => {
    if (window.confirm('確定終止當前指揮階段？本地數據將保留，但雲端同步將停止。')) {
      setIsAdmin(false);
      sessionStorage.removeItem('z-zone-admin');
      localStorage.removeItem('z-zone-active-room');
      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      status: PlayerStatus.SURVIVOR,
      joinedAt: Date.now(),
      statusChangedAt: Date.now(),
    };
    setPlayers(prev => [newPlayer, ...prev]);
    setNewName('');
  };

  const updateStatus = (id: string, status: PlayerStatus) => {
    setPlayers(prev => prev.map(p => 
      p.id === id ? { ...p, status, statusChangedAt: Date.now() } : p
    ));
  };

  const deletePlayer = (id: string) => {
    if (window.confirm('確認要移除此作戰單位？其信號將從雷達上永久消失。')) {
      setPlayers(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleGenerateReport = async () => {
    if (players.length === 0) return;
    setIsGeneratingReport(true);
    setAiReport("正在請求衛星掃描，解析實時戰況...");
    const report = await generateBattleReport(players);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans pb-24 relative overflow-x-hidden bg-[#050505] selection:bg-neon-green selection:text-black">
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} onLogin={handleLogin} />
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} players={players} roomId={roomId} />

      {/* Persistent HUD Overlay */}
      <div className="fixed top-0 left-0 w-full z-[60] flex justify-center pointer-events-none p-2">
        <div className={`flex items-center gap-4 bg-black/90 backdrop-blur-xl border px-4 py-1.5 rounded-full shadow-2xl pointer-events-auto transition-all duration-500 ${
          syncError ? 'border-red-500 shadow-red-500/20' : (roomId ? 'border-neon-green shadow-neon-green/20' : 'border-gray-800')
        }`}>
          <div className="flex items-center gap-2 border-r border-gray-800 pr-4 mr-2">
            <Clock size={12} className="text-gray-500" />
            <span className="text-[10px] font-mono font-bold text-gray-300">
              {currentTime.toLocaleTimeString([], { hour12: false })}
            </span>
          </div>
          {roomId ? (
            <div className="flex items-center gap-3">
               <button onClick={() => fetchData(roomId)} className={`flex items-center gap-2 hover:opacity-70 transition-opacity ${syncError ? 'text-red-500' : 'text-neon-green'}`}>
                <Signal size={12} className={isSyncing ? "animate-pulse" : ""} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                  {syncError ? syncError : `NET: ONLINE / ID: ${roomId}`}
                </span>
              </button>
              {syncError && <button onClick={() => fetchData(roomId)} className="text-[9px] bg-red-900/30 text-red-500 px-2 py-0.5 rounded border border-red-500/50 hover:bg-red-900/50 transition-colors uppercase">Retry</button>}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-600">
              <CloudOff size={12} />
              <span className="text-[10px] font-mono uppercase tracking-widest">Standalone Mode</span>
            </div>
          )}
        </div>
      </div>

      <div className="fixed top-4 right-4 z-50">
        <button onClick={() => isAdmin ? handleLogout() : setShowLogin(true)} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-lg backdrop-blur-md ${isAdmin ? 'bg-red-900/60 text-white border-red-500/50 hover:bg-red-700' : 'bg-gray-900/80 text-gray-400 border-gray-700 hover:text-white'}`}>
          {isAdmin ? <LogOut size={14} /> : <Lock size={14} />}
          <span className="font-mono text-xs font-bold tracking-widest">{isAdmin ? 'CMD EXIT' : 'LOGIN'}</span>
        </button>
      </div>

      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-end gap-4 mt-12 border-b border-gray-900 pb-6">
        <div className="text-center md:text-left">
          <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-blue-200 to-white italic tracking-tighter leading-none">Z-ZONE</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-[2px] w-8 bg-neon-green"></span>
            <p className="text-gray-500 font-mono text-[10px] tracking-[0.4em] uppercase">Tactical Information Link</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {isAdmin && !roomId && (
            <button onClick={handleEnableSync} disabled={isSyncing} className="group flex items-center gap-2 px-5 py-2.5 bg-yellow-900/10 border border-yellow-500/40 text-yellow-500 font-mono text-xs rounded-md hover:bg-yellow-900/30 transition-all">
              <Cloud size={14} className={isSyncing ? "animate-spin" : "group-hover:animate-bounce"} />
              ENABLE CLOUD
            </button>
          )}
          {roomId && <button onClick={() => setShowShare(true)} className="flex items-center gap-2 px-5 py-2.5 bg-neon-green/5 border border-neon-green/30 text-neon-green font-mono text-xs rounded-md hover:bg-neon-green/20 transition-all shadow-lg shadow-neon-green/5"><Share2 size={14} /> SHARE CHANNEL</button>}
          <button onClick={handleGenerateReport} disabled={isGeneratingReport || players.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-blue-900/30 border border-blue-500/40 text-blue-200 font-mono text-xs rounded-md hover:bg-blue-800/50 transition-all"><Radio size={14} className={isGeneratingReport ? "animate-pulse" : ""} /> AI TACTICAL INTEL</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Terminal Output */}
        <div className={`mb-10 bg-black/60 border-l-4 ${syncError ? 'border-red-500' : 'border-blue-500'} backdrop-blur-md p-6 relative rounded-r-xl group overflow-hidden shadow-2xl`}>
          <div className="flex justify-between items-start mb-2">
             <h3 className={`text-[10px] font-mono flex items-center gap-2 uppercase tracking-widest ${syncError ? 'text-red-400' : 'text-blue-400'}`}>
                {syncError ? <ShieldAlert size={10} /> : <Zap size={10} />} 
                System Terminal Output
             </h3>
             <div className="flex gap-1">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : (syncError ? 'bg-red-500' : 'bg-green-500')}`}></span>
                <span className="w-2 h-2 rounded-full bg-gray-800"></span>
             </div>
          </div>
          <p className={`font-mono text-base md:text-xl leading-relaxed ${isGeneratingReport || isSyncing ? 'text-gray-500 animate-pulse' : 'text-gray-100'}`}>
            <span className={syncError ? 'text-red-500 mr-2' : 'text-blue-500 mr-2'}>&gt;</span>{aiReport}
          </p>
        </div>

        <StatsBoard stats={stats} />

        {isAdmin && (
          <form onSubmit={addPlayer} className="mb-12 flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              placeholder="ENTER UNIT NAME / ID..." 
              className="flex-1 bg-gray-900/40 border border-gray-800 rounded-lg py-4 px-6 text-white focus:border-neon-green focus:bg-gray-900/60 transition-all outline-none font-mono text-lg" 
            />
            <button type="submit" className="bg-neon-green hover:bg-cyan-400 text-black font-black py-4 px-10 rounded-lg uppercase tracking-widest shadow-xl shadow-neon-green/10 transition-all active:scale-95 flex items-center justify-center gap-2">
              <Plus size={20} /> ADD UNIT
            </button>
          </form>
        )}

        {players.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-gray-800/50 rounded-3xl bg-gray-900/10">
            <div className="inline-block p-6 rounded-full bg-gray-900/50 mb-4">
              <Wifi size={40} className="text-gray-700 animate-pulse" />
            </div>
            <p className="text-gray-600 font-mono uppercase tracking-[0.6em] text-xs">Awaiting Commander Input...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {players.map(player => (
              <PlayerCard key={player.id} player={player} onStatusChange={updateStatus} onDelete={deletePlayer} readOnly={!isAdmin} />
            ))}
          </div>
        )}
      </main>
      
      {/* Background decoration */}
      <div className="fixed bottom-0 right-0 p-8 opacity-5 pointer-events-none select-none">
        <h2 className="text-[15vw] font-black italic text-white leading-none">ALPHA-7</h2>
      </div>
    </div>
  );
};

export default App;
