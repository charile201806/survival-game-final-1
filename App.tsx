import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Radio, RefreshCw, Trash2, Zap, Lock, LogOut, Share2, Link as LinkIcon, Cloud, CloudOff, Wifi, AlertCircle } from 'lucide-react';
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
  const [aiReport, setAiReport] = useState<string>('系統初始化中...');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Cloud States
  const [roomId, setRoomId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || localStorage.getItem('z-zone-active-room');
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Auth states
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('z-zone-admin') === 'true');
  const [showLogin, setShowLogin] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // 1. Initial Data Loading
  useEffect(() => {
    const initFetch = async () => {
      if (roomId) {
        setAiReport("已偵測到頻道，正在從雲端下載數據...");
        const cloudData = await getRoomData(roomId);
        if (cloudData) {
          setPlayers(cloudData);
          setAiReport("連線成功。實時戰術數據流已啟用。");
          setLastSync(Date.now());
          setSyncError(null);
        } else {
          setAiReport("連線失敗：頻道可能已刪除或連線超時。");
          setSyncError("FETCH_ERR");
        }
      } else {
        const saved = localStorage.getItem('br-players');
        if (saved) {
          setPlayers(JSON.parse(saved));
          setAiReport("載入本地緩存成功。建議開啟雲端廣播以供他人觀看。");
        } else {
          setAiReport("歡迎來到 Z-ZONE 指揮系統。請先登入並建立玩家名單。");
        }
      }
    };
    initFetch();
  }, [roomId]);

  // 2. Auto-save to Cloud (Admins only)
  useEffect(() => {
    if (isAdmin && roomId && players.length >= 0) {
      const sync = async () => {
        setIsSyncing(true);
        const success = await updateRoom(roomId, players);
        setIsSyncing(false);
        if (success) {
          setLastSync(Date.now());
          setSyncError(null);
        } else {
          setSyncError("SYNC_ERR");
        }
      };
      
      const timeoutId = setTimeout(sync, 2000);
      return () => clearTimeout(timeoutId);
    }
    
    if (isAdmin && !roomId) {
      localStorage.setItem('br-players', JSON.stringify(players));
    }
  }, [players, isAdmin, roomId]);

  // 3. Auto-refresh for Spectators (Non-admins)
  useEffect(() => {
    if (!isAdmin && roomId) {
      const interval = setInterval(async () => {
        const freshData = await getRoomData(roomId);
        if (freshData) {
          setPlayers(freshData);
          setLastSync(Date.now());
          setSyncError(null);
        } else {
          setSyncError("PULL_ERR");
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, roomId]);

  const stats: GameStats = useMemo(() => ({
    total: players.length,
    survivors: players.filter(p => p.status === PlayerStatus.SURVIVOR).length,
    infected: players.filter(p => p.status === PlayerStatus.INFECTED).length,
    eliminated: players.filter(p => p.status === PlayerStatus.ELIMINATED).length,
  }), [players]);

  const handleEnableSync = async () => {
    if (!isAdmin) return;
    setIsSyncing(true);
    setAiReport("正在請求伺服器建立廣播頻道...");
    
    try {
      const newId = await createRoom(players);
      if (newId) {
        setRoomId(newId);
        localStorage.setItem('z-zone-active-room', newId);
        
        // 更新網址而不刷新
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('room', newId);
        window.history.replaceState({}, '', newUrl.toString());
        
        setAiReport(`連線建立！您的專屬頻道 ID 為: ${newId}。請點擊分享按鈕分發連結。`);
        setSyncError(null);
        setLastSync(Date.now());
      } else {
        setAiReport("伺服器無回應。請檢查您的網路連線或稍後再試。");
        setSyncError("CONNECT_ERR");
      }
    } catch (e) {
      setAiReport("連線失敗：發生致命網路錯誤。");
      setSyncError("FATAL");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = () => {
    setIsAdmin(true);
    sessionStorage.setItem('z-zone-admin', 'true');
    setAiReport("指揮官身分驗證成功。系統權限已開啟。");
  };

  const handleLogout = () => {
    if (window.confirm('登出將結束管理權限並清除雲端快取，確定？')) {
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
    setPlayers(prev => [...prev, newPlayer]);
    setNewName('');
  };

  const updateStatus = (id: string, status: PlayerStatus) => {
    setPlayers(prev => prev.map(p => 
      p.id === id ? { ...p, status, statusChangedAt: Date.now() } : p
    ));
  };

  const deletePlayer = (id: string) => {
    if (window.confirm('確定要移除此玩家資料嗎？')) {
      setPlayers(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleGenerateReport = async () => {
    if (players.length === 0) return;
    setIsGeneratingReport(true);
    const report = await generateBattleReport(players);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans pb-24 relative overflow-x-hidden">
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} onLogin={handleLogin} />
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} players={players} roomId={roomId} />

      {/* Top Floating Status Bar */}
      <div className="fixed top-0 left-0 w-full z-[60] flex justify-center pointer-events-none p-2">
        <div className={`flex items-center gap-4 bg-black/95 backdrop-blur-lg border px-4 py-1.5 rounded-full shadow-2xl pointer-events-auto transition-all duration-700 ${
          syncError ? 'border-red-500 shadow-red-500/30' : (roomId ? 'border-neon-green shadow-neon-green/30' : 'border-gray-800')
        }`}>
          {roomId ? (
            <div className={`flex items-center gap-2 ${syncError ? 'text-red-500' : 'text-neon-green'}`}>
              <Wifi size={12} className={syncError ? "" : "animate-pulse"} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                {syncError ? `SYNC FAILURE` : `LIVE CH: ${roomId}`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <CloudOff size={12} />
              <span className="text-[10px] font-mono uppercase tracking-widest">LOCAL DATA</span>
            </div>
          )}
          {lastSync && (
            <div className="flex items-center gap-2 border-l border-gray-800 pl-4">
               <span className="text-[10px] text-gray-400 font-mono">
                {isSyncing ? 'UPLOADING...' : `SYNCED: ${new Date(lastSync).toLocaleTimeString([], { hour12: false })}`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        <button 
          onClick={() => isAdmin ? handleLogout() : setShowLogin(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-lg backdrop-blur-md ${
            isAdmin ? 'bg-red-900/80 text-white border-red-500 hover:bg-red-800' : 'bg-gray-900/80 text-gray-400 border-gray-700 hover:text-white'
          }`}
        >
          {isAdmin ? <LogOut size={14} /> : <Lock size={14} />}
          <span className="font-mono text-xs font-bold">{isAdmin ? 'LOGOUT' : 'ADMIN LOGIN'}</span>
        </button>
      </div>

      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4 mt-12">
        <div className="text-center md:text-left">
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white italic tracking-tighter">Z-ZONE</h1>
          <p className="text-gray-500 font-mono text-xs tracking-[0.3em] uppercase">Tactical Information Network</p>
        </div>
        
        {isAdmin && (
          <div className="flex flex-wrap justify-center gap-3">
            {!roomId && (
              <button 
                onClick={handleEnableSync} 
                disabled={isSyncing} 
                className={`group flex items-center gap-2 px-4 py-2 bg-yellow-900/10 border border-yellow-500/40 text-yellow-500 font-mono text-xs rounded-lg hover:bg-yellow-900/30 transition-all ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Cloud size={14} className={isSyncing ? "animate-spin" : "group-hover:animate-bounce"} />
                ENABLE CLOUD BROADCAST
              </button>
            )}
            <button onClick={() => setShowShare(true)} className="flex items-center gap-2 px-4 py-2 bg-neon-green/5 border border-neon-green/30 text-neon-green font-mono text-xs rounded-lg hover:bg-neon-green/10">
              <Share2 size={14} /> SHARE CHANNEL
            </button>
            <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="flex items-center gap-2 px-4 py-2 bg-blue-900/20 border border-blue-500/30 text-blue-200 font-mono text-xs rounded-lg hover:bg-blue-900/40">
              <Radio size={14} className={isGeneratingReport ? "animate-pulse" : ""} /> AI TACTICAL INTEL
            </button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Terminal Alert Area */}
        <div className="mb-8 bg-black/40 border-l-4 border-blue-500 backdrop-blur-sm p-5 relative rounded-r-lg">
          <div className="flex justify-between items-start mb-1">
             <h3 className="text-blue-400 text-[10px] font-mono flex items-center gap-2 uppercase tracking-widest"><Zap size={10} /> System Terminal Output</h3>
             {isSyncing && <div className="text-blue-500 text-[10px] font-mono animate-pulse">TRANSMITTING...</div>}
          </div>
          <p className={`font-mono text-sm md:text-lg leading-relaxed ${isGeneratingReport || isSyncing ? 'text-gray-500' : 'text-gray-200'}`}>
            <span className="text-blue-500 mr-2">&gt;</span>{aiReport}
          </p>
        </div>

        <StatsBoard stats={stats} />

        {isAdmin && (
          <form onSubmit={addPlayer} className="mb-10 flex gap-2">
            <input 
              type="text" value={newName} onChange={(e) => setNewName(e.target.value)} 
              placeholder="ENTRY UNIT ID..." 
              className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg py-4 px-5 text-white focus:border-neon-green focus:bg-black outline-none transition-all font-mono" 
            />
            <button type="submit" className="bg-neon-green hover:bg-cyan-400 text-black font-black py-4 px-8 rounded-lg uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-neon-green/20">DEPLOY</button>
          </form>
        )}

        {players.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-gray-800 rounded-2xl">
            <p className="text-gray-600 font-mono uppercase tracking-[0.5em] text-sm animate-pulse">Scanning for Biosignatures...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {players.map(player => (
              <PlayerCard key={player.id} player={player} onStatusChange={updateStatus} onDelete={deletePlayer} readOnly={!isAdmin} />
            ))}
          </div>
        )}
      </main>

      {/* Footer Decoration */}
      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-gray-900 flex justify-between items-center opacity-30 pointer-events-none">
        <div className="font-mono text-[10px] uppercase tracking-widest">© Z-ZONE TACTICAL LINK PROTOCOL 2.5</div>
        <div className="font-mono text-[10px] uppercase tracking-widest">SECURED ACCESS ONLY</div>
      </footer>
    </div>
  );
};

export default App;