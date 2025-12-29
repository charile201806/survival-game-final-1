
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, LogOut, Lock, Share2, Cloud, Signal, AlertCircle, Cpu, Clock, Terminal, Activity, Wifi, WifiOff, Copy, Check, Radio, Link as LinkIcon } from 'lucide-react';
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
  
  // 核心房間 ID 管理：優先讀取 URL 參數，這就像 Google 試算表的共用連結
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
  
  // 手動輸入 ID 的狀態
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualId, setManualId] = useState('');

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

  // 核心數據拉取邏輯
  const fetchData = useCallback(async (id: string) => {
    if (!id || id.length < 5) return;
    setIsSyncing(true);
    try {
      const cloudData = await getRoomData(id);
      if (cloudData) {
        // 只有當雲端有數據時才覆蓋本地，避免清空
        if (cloudData.players && cloudData.players.length > 0) {
            setPlayers(cloudData.players);
            setEvents(cloudData.events || []);
        }
        setSyncError(null);
      } else {
        setSyncError("NODE_404");
      }
    } catch (e) {
      setSyncError("CONN_ERR");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 1. 初始化載入
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

  // 2. 觀戰者邏輯：如果不是管理員且有房間 ID，則每 3 秒自動同步 (Google Sheets 式體驗)
  useEffect(() => {
    if (!isAdmin && roomId) {
      const interval = setInterval(() => fetchData(roomId), 3000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, roomId, fetchData]);

  // 3. 管理員邏輯：當數據變更時，自動推送到雲端
  useEffect(() => {
    if (isAdmin && roomId && players.length > 0) {
      const syncData = async () => {
        setIsSyncing(true);
        const success = await updateRoom(roomId, players, events);
        if (!success) setSyncError("PUSH_FAIL");
        else setSyncError(null);
        setIsSyncing(false);
      };
      const debounceTimer = setTimeout(syncData, 2000);
      return () => clearTimeout(debounceTimer);
    } else if (isAdmin && !roomId) {
      localStorage.setItem('br-players', JSON.stringify(players));
      localStorage.setItem('br-events', JSON.stringify(events));
    }
  }, [players, events, isAdmin, roomId]);

  const handleCopyLink = () => {
    if (!roomId) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleManualConnect = async () => {
     if (!manualId.trim()) return;
     const id = manualId.trim();
     setAiReport(`正在嘗試連線至指定節點 [${id}]...`);
     setIsSyncing(true);
     
     // 嘗試讀取一次以驗證 ID 是否有效
     const data = await getRoomData(id);
     if (data) {
        setRoomId(id);
        localStorage.setItem('z-zone-active-room', id);
        const url = new URL(window.location.href);
        url.searchParams.set('room', id);
        window.history.replaceState({}, '', url.toString());
        setAiReport(`連線成功！已掛載至手動節點 ${id}。`);
        setSyncError(null);
        setShowManualInput(false);
        // 如果雲端是空的但本地有資料，立刻推送一次
        if ((!data.players || data.players.length === 0) && players.length > 0) {
            await updateRoom(id, players, events);
        } else if (data.players && data.players.length > 0) {
            setPlayers(data.players);
            setEvents(data.events || []);
        }
     } else {
        setAiReport(`連線失敗。無法存取節點 ${id} (404)。請確認 ID 是否正確或已在 npoint.io 建立。`);
        setSyncError("INVALID_ID");
     }
     setIsSyncing(false);
  };

  const handleEnableSync = async () => {
    if (!isAdmin) return;
    setIsSyncing(true);
    setSyncError(null);
    setAiReport("正在建立全域戰術頻道 [ESTABLISHING LINK]...");
    
    const result = await createRoom(players, events);
    
    if (result.key) {
      setRoomId(result.key);
      localStorage.setItem('z-zone-active-room', result.key);
      const url = new URL(window.location.href);
      url.searchParams.set('room', result.key);
      window.history.replaceState({}, '', url.toString());
      setAiReport(`頻道建立成功！ID: ${result.key}。連結已更新，所有人皆可實時觀看。`);
    } else {
      setSyncError(result.error || "FAIL");
      setAiReport(`自動建立失敗 (${result.error})。請嘗試使用「手動連線」功能。`);
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
    if (!player || !window.confirm(`確定要將單位 [${player.name}] 移出通訊網？`)) return;
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

  const handleGenerateReport = async () => {
    if (isGeneratingReport || players.length === 0) return;
    setIsGeneratingReport(true);
    setAiReport("正在請求奧丁核心進行戰場評估...");
    try {
      const report = await generateBattleReport(players);
      setAiReport(report);
    } catch (error) {
      setAiReport("戰術演算失敗。通訊鏈路不穩定 (API Key Error)。");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 relative bg-dark-bg text-white ${isAdmin ? 'border-t-4 border-yellow-500/50' : ''}`}>
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} onLogin={() => { setIsAdmin(true); sessionStorage.setItem('z-zone-admin', 'true'); }} />
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} players={players} roomId={roomId} />

      {/* Real-time Status HUD */}
      <div className="fixed top-0 left-0 w-full z-50 flex justify-center p-2">
        <div className={`flex items-center gap-4 bg-black/90 border px-6 py-2 rounded-full shadow-2xl transition-all duration-500 ${syncError ? 'border-neon-red shadow-neon-red/20' : 'border-gray-800'}`}>
          <div className="flex items-center gap-2 pr-4 border-r border-gray-800 text-[10px] font-mono text-gray-500">
             <Clock size={12} /> {currentTime.toLocaleTimeString([], { hour12: false })}
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <Radio size={14} className={roomId ? (syncError ? "text-neon-red" : "text-neon-green") : "text-gray-600"} />
                {isSyncing && <span className="absolute -top-1 -right-1 w-2 h-2 bg-neon-green rounded-full animate-ping"></span>}
             </div>
             <span className={`text-[10px] font-mono uppercase tracking-widest ${syncError ? 'text-neon-red' : (roomId ? 'text-neon-green' : 'text-gray-500')}`}>
                {roomId ? (syncError ? `ERR: ${syncError}` : `LIVE: ${roomId}`) : "OFFLINE_MODE"}
             </span>
             {roomId && (
               <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-3 py-0.5 bg-gray-800 hover:bg-neon-green/20 text-gray-400 hover:text-neon-green rounded text-[9px] font-mono transition-all border border-gray-700">
                  {copySuccess ? <Check size={10} /> : <Copy size={10} />} {copySuccess ? "COPIED" : "SHARE LINK"}
               </button>
             )}
          </div>
        </div>
      </div>

      {/* Admin Access Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => isAdmin ? (setIsAdmin(false), sessionStorage.removeItem('z-zone-admin')) : setShowLogin(true)} 
          className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl border-2 transition-all duration-300 ${isAdmin ? 'bg-yellow-500 border-yellow-400 text-black scale-110 shadow-yellow-500/20' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-neon-green hover:text-neon-green'}`}
        >
          {isAdmin ? <LogOut size={24} /> : <Lock size={24} />}
          <div className="absolute right-full mr-4 px-3 py-1 bg-black border border-gray-700 rounded text-[10px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {isAdmin ? 'TERMINATE COMMAND' : 'COMMANDER LOGIN'}
          </div>
        </button>
      </div>

      <header className="max-w-6xl mx-auto mb-10 mt-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative">
          <h1 className="text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-800">Z-ZONE</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${roomId ? 'bg-neon-green animate-pulse shadow-[0_0_5px_#00f0ff]' : 'bg-gray-600'}`}></div>
            <p className="text-neon-green font-mono text-[10px] tracking-[0.4em] uppercase">Tactical Network v3.3</p>
          </div>
        </div>
        
        <div className="flex gap-2 items-center">
          {isAdmin && !roomId && (
            <>
              {!showManualInput ? (
                <>
                  <button onClick={handleEnableSync} disabled={isSyncing} className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 rounded font-mono text-xs hover:bg-yellow-500/20 transition-all shadow-lg whitespace-nowrap">
                    <Cloud size={14} /> INITIALIZE CLOUD
                  </button>
                  <button onClick={() => setShowManualInput(true)} className="flex items-center gap-2 px-3 py-3 bg-gray-800 border border-gray-700 text-gray-400 rounded font-mono text-xs hover:text-white transition-all">
                    <LinkIcon size={14} /> 手動連線
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                   <input 
                      type="text" 
                      value={manualId} 
                      onChange={(e) => setManualId(e.target.value)} 
                      placeholder="輸入 npoint ID" 
                      className="bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded text-xs font-mono outline-none w-32 focus:border-neon-green"
                   />
                   <button onClick={handleManualConnect} className="px-3 py-2 bg-neon-green text-black text-xs font-bold rounded hover:bg-white transition-colors">
                      OK
                   </button>
                   <button onClick={() => setShowManualInput(false)} className="text-gray-500 hover:text-white">
                      <Plus size={18} className="rotate-45" />
                   </button>
                </div>
              )}
            </>
          )}
          <button onClick={handleGenerateReport} disabled={isGeneratingReport || players.length === 0} className="flex items-center gap-2 px-5 py-3 bg-blue-500/10 border border-blue-500/50 text-blue-400 rounded font-mono text-xs hover:bg-blue-500/20 transition-all whitespace-nowrap">
            <Cpu size={14} className={isGeneratingReport ? "animate-spin" : ""} /> ODIN EVALUATION
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Terminal Output */}
        <div className="mb-12 bg-black/80 border border-gray-800 rounded-lg shadow-2xl overflow-hidden group">
          <div className="bg-gray-900/50 px-4 py-2 border-b border-gray-800 flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase">
             <div className="flex gap-2 items-center">
               <Terminal size={12} className="text-neon-green" />
               <span>A.I. Strat-Core Output</span>
             </div>
             {isAdmin ? <span className="text-yellow-500 font-bold">WRITABLE_LINK</span> : <span className="text-blue-500">READ_ONLY_MODE</span>}
          </div>
          <div className="p-8 min-h-[120px] font-mono text-lg md:text-xl text-gray-200 bg-gradient-to-br from-black to-gray-900/30">
             <span className="text-neon-green mr-3 font-bold">$</span>{displayText}<span className="w-2.5 h-5 bg-neon-green inline-block ml-1 animate-pulse"></span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <StatsBoard stats={stats} />
            
            {isAdmin && (
              <form onSubmit={handleAddPlayer} className="mb-8 flex gap-3">
                <div className="relative flex-1">
                  <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                  <input 
                    type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="輸入單位呼號 (如: ALPHA-01)..."
                    className="w-full bg-gray-900/50 border border-gray-800 rounded px-12 py-4 text-xl focus:border-neon-green outline-none font-mono text-white transition-all"
                  />
                </div>
                <button type="submit" className="bg-neon-green text-black font-black px-10 rounded flex items-center gap-2 hover:bg-white transition-all active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                  <Plus size={24} /> 部署
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
               {players.map(player => (
                 <PlayerCard key={player.id} player={player} onStatusChange={handleStatusChange} onDelete={handleDeletePlayer} readOnly={!isAdmin} />
               ))}
               {players.length === 0 && (
                 <div className="col-span-full py-24 text-center border-2 border-dashed border-gray-800 rounded-2xl opacity-30">
                   <p className="font-mono tracking-[0.5em] uppercase text-gray-500">等待指揮官接入戰術數據...</p>
                 </div>
               )}
            </div>
          </div>
          
          <div className="lg:col-span-1">
             <ActivityLog events={events} />
             <div className="bg-panel-bg border border-gray-800 p-6 rounded-lg shadow-xl font-mono">
                <h3 className="text-gray-500 text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2">
                   <Activity size={12} className="text-neon-green" /> 通訊診斷 / SYS_DIAG
                </h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">連線節點</span>
                      <span className={roomId ? "text-neon-green" : "text-yellow-600"}>{roomId ? "UPLINK_ENCRYPTED" : "LOCAL_ONLY"}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">刷新頻率</span>
                      <span className="text-gray-300">{isAdmin ? "REAL-TIME (PUSH)" : "3.0 SEC (PULL)"}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">存取級別</span>
                      <span className={isAdmin ? "text-yellow-500 font-bold" : "text-blue-500"}>{isAdmin ? "COMMANDER_ROOT" : "OBSERVER_LINK"}</span>
                   </div>
                   <div className="pt-4 border-t border-gray-800">
                      <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-neon-green transition-all duration-1000" 
                          style={{ width: `${stats.total > 0 ? (stats.survivors / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-2 text-[9px] text-gray-600 uppercase">
                        <span>戰損評估</span>
                        <span>{stats.total > 0 ? Math.round((stats.eliminated / stats.total) * 100) : 0}% LOSS</span>
                      </div>
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
