import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, LogOut, Lock, Share2, Cloud, Signal, AlertCircle, Cpu, Clock, Terminal, Activity, Wifi, WifiOff } from 'lucide-react';
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

  // 音效反饋
  const playSound = (type: 'click' | 'success' | 'alert') => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'click') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'alert') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  };

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

  const addEvent = useCallback((playerName: string, detail: string, type: GameEvent['type'] = 'STATUS_CHANGE') => {
    const newEvent: GameEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      playerName,
      type,
      detail
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 50));
    playSound('click');
  }, []);

  const fetchData = useCallback(async (id: string) => {
    if (!id || id === "undefined" || id === "null") return;
    setIsSyncing(true);
    try {
      const cloudData = await getRoomData(id);
      setIsSyncing(false);
      if (cloudData) {
        setPlayers(cloudData.players || []);
        setEvents(cloudData.events || []);
        setSyncError(null);
      } else {
        setSyncError("NODE_NOT_FOUND");
      }
    } catch (e) {
      setIsSyncing(false);
      setSyncError("CONN_TIMEOUT");
    }
  }, []);

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

  useEffect(() => {
    if (isAdmin && roomId) {
      const sync = async () => {
        setIsSyncing(true);
        const success = await updateRoom(roomId, players, events);
        setIsSyncing(false);
        if (!success) setSyncError("SYNC_FAIL");
        else setSyncError(null);
      };
      const tid = setTimeout(sync, 4000);
      return () => clearTimeout(tid);
    }
    if (isAdmin && !roomId) {
      localStorage.setItem('br-players', JSON.stringify(players));
      localStorage.setItem('br-events', JSON.stringify(events));
    }
  }, [players, events, isAdmin, roomId]);

  useEffect(() => {
    if (!isAdmin && roomId) {
      const interval = setInterval(() => fetchData(roomId), 12000);
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
    setSyncError(null);
    setAiReport("正在嘗試與中央通訊節點進行握手協定 [HANDSHAKE]...");
    
    const result = await createRoom(players, events);
    
    if (result.key) {
      setRoomId(result.key);
      localStorage.setItem('z-zone-active-room', result.key);
      const url = new URL(window.location.href);
      url.searchParams.set('room', result.key);
      window.history.replaceState({}, '', url.toString());
      setAiReport(`連線建立成功。戰術頻道 ID: ${result.key}。開始廣播實時數據...`);
      setIsSyncing(false);
    } else {
      setIsSyncing(false);
      const errCode = result.error || "UNKNOWN_FAILURE";
      setSyncError(errCode);
      setAiReport(`連線請求被拒絕。錯誤代碼: ${errCode}。系統已切換至 [本地指揮模式]。`);
      playSound('alert');
    }
  };

  const handleStatusChange = (id: string, status: PlayerStatus) => {
    const player = players.find(p => p.id === id);
    if (!player) return;
    const statusLabels = { [PlayerStatus.SURVIVOR]: '倖存', [PlayerStatus.INFECTED]: '已感染', [PlayerStatus.ELIMINATED]: '已淘汰' };
    setPlayers(prev => prev.map(p => p.id === id ? {...p, status, statusChangedAt: Date.now()} : p));
    addEvent(player.name, `狀態變更為 [${statusLabels[status]}]`);
  };

  const handleDeletePlayer = (id: string) => {
    const player = players.find(p => p.id === id);
    if (!player || !window.confirm(`確定要將單位 [${player.name}] 移出通訊網？`)) return;
    setPlayers(prev => prev.filter(p => p.id !== id));
    addEvent(player.name, "已從戰區名單移除", "DELETE");
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const player: Player = { id: crypto.randomUUID(), name: newName.trim(), status: PlayerStatus.SURVIVOR, joinedAt: Date.now(), statusChangedAt: Date.now() };
    setPlayers(prev => [player, ...prev]);
    addEvent(player.name, "已加入戰區", "JOIN");
    setNewName('');
  };

  const handleGenerateReport = async () => {
    if (players.length === 0) return;
    setIsGeneratingReport(true);
    setAiReport("正在分析戰區熱力圖與生命指標...");
    const report = await generateBattleReport(players);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 font-sans pb-32 relative bg-[#050505] text-white ${stats.survivors / stats.total < 0.3 && stats.total > 0 ? 'animate-danger-pulse' : ''}`}>
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} onLogin={() => { setIsAdmin(true); sessionStorage.setItem('z-zone-admin', 'true'); }} />
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} players={players} roomId={roomId} />

      {/* Top HUD */}
      <div className="fixed top-0 left-0 w-full z-50 flex justify-center p-2 pointer-events-none">
        <div className={`flex items-center gap-6 bg-black/90 backdrop-blur-md border px-5 py-2 rounded-full shadow-2xl pointer-events-auto transition-all ${syncError ? 'border-red-500 text-red-500' : 'border-gray-800'}`}>
          <div className="flex items-center gap-2 pr-4 border-r border-gray-800">
            <Clock size={12} className="text-gray-500" />
            <span className="text-[10px] font-mono tracking-widest">{currentTime.toLocaleTimeString([], { hour12: false })}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {roomId ? (syncError ? <WifiOff size={14} /> : <Wifi size={14} className="text-neon-green" />) : <Signal size={14} className="text-gray-500" />}
              <span className={`text-[10px] font-mono uppercase tracking-tighter ${syncError ? 'text-red-500' : (roomId ? 'text-neon-green' : 'text-gray-500')}`}>
                {roomId ? `CHANNEL: ${roomId}` : 'LOCAL_UPLINK'}
              </span>
            </div>
            {isSyncing && <span className="text-[8px] bg-neon-green/10 text-neon-green px-1.5 py-0.5 rounded animate-pulse font-mono font-bold">SYNC...</span>}
            {syncError && <button onClick={() => roomId ? fetchData(roomId) : handleEnableSync()} className="text-[8px] bg-red-900 hover:bg-red-800 text-white px-2 py-0.5 rounded flex items-center gap-1 transition-colors"><AlertCircle size={8} /> RETRY ({syncError})</button>}
          </div>
        </div>
      </div>

      <div className="fixed top-4 right-4 z-50">
        <button 
          onClick={() => isAdmin ? (window.confirm('確定終止指揮權限？') && (setIsAdmin(false), sessionStorage.removeItem('z-zone-admin'))) : setShowLogin(true)} 
          className={`flex items-center gap-2 px-4 py-2 rounded border transition-all ${isAdmin ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-white'}`}
        >
          {isAdmin ? <LogOut size={14} /> : <Lock size={14} />}
          <span className="text-[10px] font-mono font-bold">{isAdmin ? 'CMD EXIT' : 'CMD LOGIN'}</span>
        </button>
      </div>

      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-6 mt-12">
        <div className="relative group">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-800 italic tracking-tighter leading-none select-none group-hover:scale-105 transition-transform duration-500">Z-ZONE</h1>
          <div className="absolute -bottom-2 left-0 flex items-center gap-2">
            <div className="h-1 w-12 bg-neon-green shadow-[0_0_10px_#00f0ff]"></div>
            <span className="text-[9px] font-mono text-neon-green tracking-[0.5em] uppercase font-bold">Tactical Command v3.1</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isAdmin && !roomId && (
            <button onClick={handleEnableSync} disabled={isSyncing} className="flex items-center gap-2 px-4 py-3 bg-yellow-900/20 border border-yellow-500/50 text-yellow-500 rounded font-mono text-xs hover:bg-yellow-900/40 transition-all shadow-lg shadow-yellow-500/5">
              <Cloud size={14} /> INITIALIZE CLOUD
            </button>
          )}
          {roomId && (
            <button onClick={() => setShowShare(true)} className="flex items-center gap-2 px-4 py-3 bg-neon-green/10 border border-neon-green/50 text-neon-green rounded font-mono text-xs hover:bg-neon-green/20 transition-all">
              <Share2 size={14} /> BROADCAST
            </button>
          )}
          <button onClick={handleGenerateReport} disabled={isGeneratingReport || players.length === 0} className="flex items-center gap-2 px-4 py-3 bg-blue-900/30 border border-blue-500/50 text-blue-300 rounded font-mono text-xs hover:bg-blue-800/50 transition-all shadow-lg shadow-blue-500/10">
            <Cpu size={14} className={isGeneratingReport ? "animate-spin" : ""} /> ODIN AI
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="mb-12 bg-black border border-gray-800 rounded-lg shadow-2xl overflow-hidden group">
          <div className="bg-gray-900/50 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50 group-hover:bg-red-500 transition-colors"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50 group-hover:bg-yellow-500 transition-colors"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50 group-hover:bg-green-500 transition-colors"></div>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={10} className="text-neon-green animate-pulse" />
              <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">A.I. STRAT_CORE / OUTPUT</span>
            </div>
          </div>
          <div className="p-6 md:p-8 min-h-[120px] bg-gradient-to-br from-black to-gray-900/30">
            <p className="font-mono text-lg md:text-xl leading-relaxed text-gray-200">
              <span className="text-neon-green mr-3 animate-pulse font-bold">$</span>
              {displayText}
              <span className="inline-block w-2.5 h-5 bg-neon-green ml-1 animate-pulse"></span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
             <StatsBoard stats={stats} />
             {isAdmin && (
              <form onSubmit={handleAddPlayer} className="mb-8 flex gap-2">
                <div className="relative flex-1">
                  <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="輸入呼號 (如: ALPHA-01)..."
                    className="w-full bg-gray-900/50 border border-gray-800 rounded pl-12 pr-4 py-4 text-xl focus:border-neon-green outline-none font-mono transition-all"
                  />
                </div>
                <button type="submit" className="bg-neon-green text-black font-black px-8 rounded flex items-center gap-2 hover:bg-white transition-all active:scale-95 shadow-lg shadow-neon-green/20">
                  <Plus size={24} /> <span className="hidden sm:inline">部署</span>
                </button>
              </form>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {players.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-800 rounded-xl opacity-50">
                  <p className="text-gray-600 font-mono uppercase tracking-[0.3em]">等待指揮官接入單位...</p>
                </div>
              ) : (
                players.map(player => (
                  <PlayerCard key={player.id} player={player} onStatusChange={handleStatusChange} onDelete={handleDeletePlayer} readOnly={!isAdmin} />
                ))
              )}
            </div>
          </div>
          <div className="lg:col-span-1">
            <ActivityLog events={events} />
            <div className="bg-panel-bg border border-gray-800 p-6 rounded-lg shadow-xl">
              <h4 className="text-gray-400 text-[10px] font-mono uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green"></div>
                系統診斷 / SYS_DIAG
              </h4>
              <div className="space-y-5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-500">同步狀態</span>
                  <div className="flex items-center gap-2">
                    <span className={syncError ? "text-red-500" : "text-neon-green"}>
                      {syncError ? "LINK_INTERRUPTED" : (roomId ? "ENCRYPTED_LINK" : "LOCAL_ONLY")}
                    </span>
                    <div className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-red-500 animate-pulse' : (roomId ? 'bg-neon-green' : 'bg-gray-600')}`}></div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-500">權限層級</span>
                  <span className={isAdmin ? "text-yellow-500" : "text-gray-500"}>{isAdmin ? "ROOT_ACCESS" : "GUEST_READ"}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-500">戰場時戳</span>
                  <span className="text-gray-300">{currentTime.toLocaleTimeString()}</span>
                </div>
                <div className="pt-4 border-t border-gray-800/50">
                   <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-neon-green transition-all duration-1000" 
                        style={{ width: `${stats.total > 0 ? (stats.survivors / stats.total) * 100 : 0}%` }}
                      ></div>
                   </div>
                   <div className="flex justify-between mt-2">
                      <span className="text-[9px] text-gray-600 font-mono">生存率評估</span>
                      <span className="text-[9px] text-neon-green font-mono">{stats.total > 0 ? Math.round((stats.survivors / stats.total) * 100) : 0}%</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes danger-pulse {
          0%, 100% { box-shadow: inset 0 0 0px rgba(255, 0, 0, 0); }
          50% { box-shadow: inset 0 0 150px rgba(255, 0, 0, 0.2); }
        }
        .animate-danger-pulse { animation: danger-pulse 1.5s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default App;
