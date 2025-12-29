
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, LogOut, Lock, Share2, Cloud, Signal, AlertCircle, Cpu, Clock, Terminal, Activity, Wifi, WifiOff, Copy, Check } from 'lucide-react';
import { Player, PlayerStatus, GameStats, GameEvent, RoomData } from './types';
import { StatsBoard } from './components/StatsBoard';
import { PlayerCard } from './components/PlayerCard';
import { LoginModal } from './components/LoginModal';
import { ShareModal } from './components/ShareModal';
import { ActivityLog } from './components/ActivityLog';
import { generateBattleReport } from './services/geminiService';
import { createRoom, updateRoom, getRoomData } from './services/cloudService';

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [newName, setNewName] = useState('');
  const [aiReport, setAiReport] = useState<string>('Z-ZONE 戰術內核已就緒。等待指令...');
  const [displayText, setDisplayText] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [copySuccess, setCopySuccess] = useState(false);
  
  const [roomId, setRoomId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('room');
    return (id && id !== "undefined" && id !== "null") ? id : localStorage.getItem('z-zone-active-room');
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
    }, 20);
    return () => clearInterval(timer);
  }, [aiReport]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async (id: string) => {
    if (!id || id === "undefined" || id === "null") return;
    setIsSyncing(true);
    try {
      const cloudData = await getRoomData(id);
      if (cloudData) {
        setPlayers(cloudData.players || []);
        setEvents(cloudData.events || []);
        setSyncError(null);
      } else {
        setSyncError("NODE_OFFLINE");
      }
    } catch (e) {
      setSyncError("CONN_TIMEOUT");
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  }, []);

  // 初始載入
  useEffect(() => {
    if (roomId) {
      fetchData(roomId);
    } else {
      const savedPlayers = localStorage.getItem('br-players');
      const savedEvents = localStorage.getItem('br-events');
      if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
      if (savedEvents) setEvents(JSON.parse(savedEvents));
    }
  }, [roomId, fetchData]);

  // 管理員自動同步 (當數據變更時推送)
  useEffect(() => {
    if (isAdmin && roomId) {
      const sync = async () => {
        setIsSyncing(true);
        const success = await updateRoom(roomId, players, events);
        if (!success) setSyncError("SYNC_FAIL");
        else setSyncError(null);
        setTimeout(() => setIsSyncing(false), 500);
      };
      // 防抖，避免頻繁點擊時過度請求
      const tid = setTimeout(sync, 2000);
      return () => clearTimeout(tid);
    }
  }, [players, events, isAdmin, roomId]);

  // 高頻刷新 (針對觀戰者, 每 5 秒同步一次)
  useEffect(() => {
    if (!isAdmin && roomId) {
      const interval = setInterval(() => fetchData(roomId), 5000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, roomId, fetchData]);

  const handleCopyLink = () => {
    if (!roomId) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleEnableSync = async () => {
    if (!isAdmin) return;
    setIsSyncing(true);
    setSyncError(null);
    setAiReport("正在建立雲端共用頻道...");
    
    const result = await createRoom(players, events);
    
    if (result.key) {
      setRoomId(result.key);
      localStorage.setItem('z-zone-active-room', result.key);
      const url = new URL(window.location.href);
      url.searchParams.set('room', result.key);
      window.history.replaceState({}, '', url.toString());
      setAiReport(`連線成功！頻道 ID: ${result.key}。其他人現在可以透過邀請連結實時觀看。`);
    } else {
      setSyncError(result.error || "FAIL");
      setAiReport(`連線失敗 (${result.error})。請稍後再試或使用本地模式。`);
    }
    setIsSyncing(false);
  };

  const stats: GameStats = useMemo(() => ({
    total: players.length,
    survivors: players.filter(p => p.status === PlayerStatus.SURVIVOR).length,
    infected: players.filter(p => p.status === PlayerStatus.INFECTED).length,
    eliminated: players.filter(p => p.status === PlayerStatus.ELIMINATED).length,
  }), [players]);

  const addEvent = useCallback((playerName: string, detail: string) => {
    const newEvent: GameEvent = { id: crypto.randomUUID(), timestamp: Date.now(), playerName, type: 'STATUS_CHANGE', detail };
    setEvents(prev => [newEvent, ...prev].slice(0, 50));
  }, []);

  const handleStatusChange = (id: string, status: PlayerStatus) => {
    if (!isAdmin) return;
    const player = players.find(p => p.id === id);
    if (!player) return;
    const statusLabels = { [PlayerStatus.SURVIVOR]: '倖存', [PlayerStatus.INFECTED]: '已感染', [PlayerStatus.ELIMINATED]: '已淘汰' };
    setPlayers(prev => prev.map(p => p.id === id ? {...p, status, statusChangedAt: Date.now()} : p));
    addEvent(player.name, `狀態變更為 [${statusLabels[status]}]`);
  };

  const handleDeletePlayer = (id: string) => {
    if (!isAdmin) return;
    const player = players.find(p => p.id === id);
    if (!player || !window.confirm(`確定移除 ${player.name}？`)) return;
    setPlayers(prev => prev.filter(p => p.id !== id));
    addEvent(player.name, "已從戰區名單移除");
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newName.trim()) return;
    const player: Player = { id: crypto.randomUUID(), name: newName.trim(), status: PlayerStatus.SURVIVOR, joinedAt: Date.now(), statusChangedAt: Date.now() };
    setPlayers(prev => [player, ...prev]);
    addEvent(player.name, "已部署至戰區");
    setNewName('');
  };

  // Fix: Implement the missing handleGenerateReport function.
  const handleGenerateReport = async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    setAiReport("正在解析戰區數據，請求奧丁核心進行戰術演算...");
    try {
      const report = await generateBattleReport(players);
      setAiReport(report);
    } catch (error) {
      console.error("ODIN failure:", error);
      setAiReport("戰術演算失敗：連線至奧丁核心時發生異常。");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 relative bg-dark-bg text-white ${isAdmin ? 'border-[4px] border-yellow-500/10' : ''}`}>
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} onLogin={() => { setIsAdmin(true); sessionStorage.setItem('z-zone-admin', 'true'); }} />
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} players={players} roomId={roomId} />

      {/* Real-time HUD */}
      <div className="fixed top-0 left-0 w-full z-50 flex justify-center p-2">
        <div className={`flex items-center gap-4 bg-black/90 border px-6 py-2 rounded-full shadow-2xl transition-all duration-500 ${syncError ? 'border-red-500 shadow-red-500/20' : 'border-gray-800'}`}>
          <div className="flex items-center gap-2 pr-4 border-r border-gray-800 text-[10px] font-mono text-gray-500">
             <Clock size={12} /> {currentTime.toLocaleTimeString([], { hour12: false })}
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <Signal size={14} className={roomId ? (syncError ? "text-red-500" : "text-neon-green") : "text-gray-600"} />
                {isSyncing && <span className="absolute -top-1 -right-1 w-2 h-2 bg-neon-green rounded-full animate-ping"></span>}
             </div>
             <span className="text-[10px] font-mono uppercase tracking-widest hidden sm:inline">
                {roomId ? `Channel: ${roomId}` : "Offline Mode"}
             </span>
             {roomId && (
               <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-800 hover:bg-neon-green/20 text-gray-400 hover:text-neon-green rounded text-[9px] font-mono transition-all">
                  {copySuccess ? <Check size={10} /> : <Copy size={10} />} {copySuccess ? "COPIED" : "SHARE LINK"}
               </button>
             )}
          </div>
        </div>
      </div>

      {/* Admin Auth */}
      <div className="fixed top-4 right-4 z-50">
        <button onClick={() => isAdmin ? (setIsAdmin(false), sessionStorage.removeItem('z-zone-admin')) : setShowLogin(true)} className={`p-3 rounded-full border shadow-xl transition-all ${isAdmin ? 'bg-yellow-500 border-yellow-600 text-black scale-110' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>
          {isAdmin ? <Plus size={20} /> : <Lock size={20} />}
        </button>
      </div>

      <header className="max-w-6xl mx-auto mb-10 mt-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-800">Z-ZONE</h1>
          <p className="text-neon-green font-mono text-xs tracking-[0.4em] uppercase mt-1">Tactical Network v3.2</p>
        </div>
        
        <div className="flex gap-2">
          {isAdmin && !roomId && (
            <button onClick={handleEnableSync} disabled={isSyncing} className="flex items-center gap-2 px-5 py-3 bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 rounded font-mono text-xs hover:bg-yellow-500/20 transition-all">
              <Cloud size={14} /> 開啟雲端共用
            </button>
          )}
          <button onClick={() => { if (players.length > 0) handleGenerateReport(); }} className="flex items-center gap-2 px-5 py-3 bg-blue-500/10 border border-blue-500/50 text-blue-400 rounded font-mono text-xs hover:bg-blue-500/20 transition-all">
            <Cpu size={14} className={isGeneratingReport ? "animate-spin" : ""} /> ODIN AI 分析
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Terminal Output */}
        <div className="mb-12 bg-black border border-gray-800 rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-gray-900/50 px-4 py-2 border-b border-gray-800 flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase">
             <span>A.I. Strat-Core Output</span>
             {roomId && !isAdmin && <span className="text-neon-green animate-pulse">Live Link Active</span>}
          </div>
          <div className="p-8 min-h-[100px] font-mono text-lg md:text-xl text-gray-200">
             <span className="text-neon-green mr-2">$</span>{displayText}<span className="w-2 h-5 bg-neon-green inline-block ml-1 animate-pulse"></span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <StatsBoard stats={stats} />
            
            {isAdmin && (
              <form onSubmit={handleAddPlayer} className="mb-8 flex gap-2">
                <input 
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="輸入單位呼號..."
                  className="flex-1 bg-gray-900 border border-gray-800 rounded px-6 py-4 text-xl focus:border-neon-green outline-none font-mono"
                />
                <button type="submit" className="bg-neon-green text-black font-black px-8 rounded flex items-center gap-2 hover:bg-white transition-all active:scale-95">
                  <Plus size={24} /> 部署
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
               {players.map(player => (
                 <PlayerCard key={player.id} player={player} onStatusChange={handleStatusChange} onDelete={handleDeletePlayer} readOnly={!isAdmin} />
               ))}
               {players.length === 0 && (
                 <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-800 rounded-xl opacity-30">
                   <p className="font-mono tracking-widest uppercase">等待指揮官載入數據...</p>
                 </div>
               )}
            </div>
          </div>
          
          <div className="lg:col-span-1">
             <ActivityLog events={events} />
             <div className="bg-panel-bg border border-gray-800 p-6 rounded-lg text-xs font-mono">
                <h3 className="text-gray-500 uppercase tracking-widest mb-4">通訊診斷</h3>
                <div className="space-y-3">
                   <div className="flex justify-between">
                      <span className="text-gray-600">連線模式</span>
                      <span className={roomId ? "text-neon-green" : "text-yellow-600"}>{roomId ? "SHARED_CLOUD" : "LOCAL_NODE"}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">刷新頻率</span>
                      <span className="text-gray-300">{isAdmin ? "REAL-TIME (PUSH)" : "4.0 SEC (PULL)"}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">存取權限</span>
                      <span className={isAdmin ? "text-yellow-500" : "text-blue-500"}>{isAdmin ? "COMMANDER_ROOT" : "GUEST_OBSERVER"}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
