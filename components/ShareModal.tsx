import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Radio, Globe, RotateCcw, Cloud, AlertTriangle } from 'lucide-react';
import { Player } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  roomId: string | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, players, roomId }) => {
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      const savedUrl = localStorage.getItem('z-zone-public-url');
      setBaseUrl(savedUrl || window.location.origin + window.location.pathname);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const generateUrl = () => {
    const cleanBase = baseUrl.trim().replace(/\/$/, '');
    if (roomId) {
      // Priority 1: Persistent Room URL
      return `${cleanBase}?room=${roomId}`;
    } else {
      // Priority 2: Snapshot URL (Legacy)
      const json = JSON.stringify(players);
      const base64 = btoa(unescape(encodeURIComponent(json)));
      return `${cleanBase}?data=${base64}`;
    }
  };

  const shareUrl = generateUrl();
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}&bgcolor=141414&color=00f0ff`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-panel-bg border border-neon-green/50 shadow-[0_0_50px_rgba(0,240,255,0.2)] rounded-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gray-900/80 p-4 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2 text-neon-green">
            <Radio className="animate-pulse" size={18} />
            <span className="font-mono text-sm uppercase font-bold">{roomId ? '實時連線頻道' : '單次戰況快照'}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 flex flex-col items-center overflow-y-auto">
          {roomId ? (
            <div className="w-full bg-green-900/20 border border-green-500/30 rounded p-3 mb-4 flex gap-3 items-start">
              <Cloud className="text-neon-green flex-shrink-0" size={20} />
              <p className="text-[10px] text-green-200/80 leading-relaxed font-mono">
                此連結為<strong>永久頻道</strong>。管理員在電腦端更改狀態後，觀戰者只需重整網頁或等待 10 秒即會同步。
              </p>
            </div>
          ) : (
            <div className="w-full bg-yellow-900/20 border border-yellow-500/30 rounded p-3 mb-4 flex gap-3 items-start">
              <AlertTriangle className="text-yellow-500 flex-shrink-0" size={20} />
              <p className="text-[10px] text-yellow-200/80 leading-relaxed font-mono">
                目前為<strong>手動快照模式</strong>。建議點擊主畫面的「開啟雲端廣播」以取得實時同步連結。
              </p>
            </div>
          )}

          <div className="bg-white p-2 rounded-lg mb-6 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <img src={qrCodeUrl} alt="QR" className="w-48 h-48 object-contain" />
          </div>

          <div className="w-full mb-4">
            <div className="flex justify-between items-end mb-1">
              <label className="text-[10px] text-gray-500 font-mono">PUBLIC BASE URL</label>
              <button onClick={() => {
                const current = window.location.origin + window.location.pathname;
                setBaseUrl(current);
                localStorage.removeItem('z-zone-public-url');
              }} className="text-[10px] text-gray-600 hover:text-neon-green flex items-center gap-1"><RotateCcw size={10} /> RESET</button>
            </div>
            <input 
              type="text" value={baseUrl} 
              onChange={(e) => {
                setBaseUrl(e.target.value);
                localStorage.setItem('z-zone-public-url', e.target.value);
              }}
              className="w-full bg-gray-900 border border-gray-700 text-neon-green text-xs font-mono p-2 rounded outline-none"
              placeholder="您的公開網址"
            />
          </div>

          <div className="w-full relative">
            <div className="flex items-center gap-2 w-full">
              <input type="text" readOnly value={shareUrl} className="w-full bg-black border border-gray-700 text-gray-500 text-[10px] font-mono p-3 rounded outline-none" />
              <button onClick={handleCopy} className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded transition-colors">
                {copied ? <Check size={16} className="text-neon-green" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 p-3 border-t border-gray-800 text-center font-mono text-[10px] text-gray-600">
          {roomId ? 'PERSISTENT CLOUD CHANNEL ENABLED' : 'LOCAL SNAPSHOT MODE'}
        </div>
      </div>
    </div>
  );
};