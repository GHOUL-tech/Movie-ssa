import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  ArrowRight, 
  Heart, 
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminId.trim() || !adminPass.trim()) {
      setError('Please provide both Admin ID and Password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = loginAdmin(adminId, adminPass);
      setLoading(false);
      if (res.success) {
        onSuccess();
        onClose();
        navigate('/admin');
      } else {
        setError(res.error || 'Invalid Admin Credentials.');
      }
    }, 400);
  };

  const handleQuickFill = () => {
    setAdminId('Rahin');
    setAdminPass('rahin5566');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-neutral-800/80 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-pink-600 p-0.5 shadow-lg shadow-red-500/20 flex-shrink-0">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <Heart className="w-6 h-6 text-red-500 fill-red-500 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white tracking-wide">Zinovis Admin Portal</h3>
              <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                ROOT
              </span>
            </div>
            <p className="text-xs text-neutral-400">Restricted administrator access console</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">
              Admin Identification (ID)
            </label>
            <div className="relative flex items-center">
              <UserCheck className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Enter Admin ID (e.g. Rahin)"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">
              Security Passcode
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                placeholder="Enter Admin Password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate as Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>


          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-neutral-800/80 text-center">
          <p className="text-[11px] text-neutral-400 flex items-center justify-center gap-1">
            <span>Access point initiated via</span>
            <Heart className="w-3 h-3 text-red-500 fill-current inline" />
            <span>Love Emoji Portal</span>
          </p>
        </div>
      </div>
    </div>
  );
};
