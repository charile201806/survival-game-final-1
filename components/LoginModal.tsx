import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Terminal, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setPassword('');
      setError(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hardcoded simple password for client-side demo
    if (password === 'admin') {
      onLogin();
      onClose();
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer" 
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-panel-bg border border-gray-700 shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden relative animate-in fade-in zoom-in duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-900/80 p-3 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2 text-neon-red">
            <ShieldAlert size={18} />
            <span className="font-mono text-xs tracking-widest uppercase">Security Clearance Required</span>
          </div>
          {/* Top Right Close Button */}
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors p-1" 
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="inline-block p-4 rounded-full bg-red-900/20 text-neon-red mb-3 border border-red-900/50">
              <ShieldAlert size={48} />
            </div>
            <h3 className="text-xl text-white font-bold tracking-wider">身份驗證</h3>
            <p className="text-gray-500 text-xs font-mono mt-1">請輸入戰術指揮官授權碼</p>
          </div>

          <form onSubmit={handleSubmit} className="relative">
            <div className={`relative transition-all duration-200 ${error ? 'animate-shake' : ''}`}>
              <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="PASSWORD"
                className={`w-full bg-black border ${error ? 'border-neon-red text-neon-red placeholder-red-900' : 'border-gray-700 text-white focus:border-neon-green'} rounded px-10 py-3 font-mono outline-none transition-colors`}
              />
            </div>
            
            {error && (
              <p className="text-neon-red text-xs font-mono mt-2 text-center animate-pulse">
                ACCESS DENIED. INVALID CREDENTIALS.
              </p>
            )}

            <button
              type="submit"
              className="w-full mt-6 bg-gray-800 hover:bg-neon-green/20 hover:text-neon-green hover:border-neon-green text-gray-300 border border-gray-600 font-mono py-2 rounded transition-all uppercase tracking-widest text-sm"
            >
              Authenticate
            </button>
          </form>
        </div>

        {/* Footer decoration */}
        <div className="bg-black/50 p-2 border-t border-gray-800 flex justify-between text-[10px] text-gray-600 font-mono uppercase">
          <span>Sys.Ver.2.0</span>
          <span>Encrypted Connection</span>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
};