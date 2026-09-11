import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Headphones, 
  Sparkles, 
  Check, 
  CheckCheck,
  User as UserIcon,
  ShieldCheck,
  Smile,
  Zap,
  Film
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SupportMessage } from '../types';
import { sendSupportMessageToBackend, subscribeToUserSupportMessages } from '../services/backendService';

interface LiveSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to get or create a persistent guest support ID
const getPersistentGuestId = (): string => {
  try {
    let id = localStorage.getItem('zinovis_guest_support_id');
    if (!id) {
      id = `guest_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
      localStorage.setItem('zinovis_guest_support_id', id);
    }
    return id;
  } catch {
    return 'guest_session';
  }
};

// Subtle Web Audio notification chime when a new Admin message arrives
const playMessageChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
};

export const LiveSupportModal: React.FC<LiveSupportModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, isLoggedIn, openAuthModal } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [guestName, setGuestName] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousMessageCountRef = useRef<number>(0);

  // Derive active userId & guest tracking ID
  const guestId = getPersistentGuestId();
  const effectiveUserId = currentUser?.id || guestId;
  const targetIds = currentUser?.id ? [currentUser.id, guestId] : [guestId];

  // Subscribe to real-time support messages from Firestore
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToUserSupportMessages(targetIds, (incomingMsgs) => {
      if (incomingMsgs) {
        setMessages((prev) => {
          // Check if a new message from admin arrived
          const prevAdminCount = prev.filter(m => m.sender === 'admin').length;
          const newAdminCount = incomingMsgs.filter(m => m.sender === 'admin').length;
          if (newAdminCount > prevAdminCount && prev.length > 0) {
            playMessageChime();
          }

          // Merge by ID to avoid duplicates while preserving optimistic entries
          const existingIds = new Set(incomingMsgs.map(m => m.id));
          const optimisticNotYetSynced = prev.filter(m => m.id.startsWith('temp_') && !existingIds.has(m.id));
          return [...incomingMsgs, ...optimisticNotYetSynced].sort((a, b) => a.createdAt - b.createdAt);
        });
      }
    });

    return () => unsubscribe();
  }, [isOpen, currentUser?.id, guestId]);

  // Auto-scroll to bottom on messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Auto-focus input on modal open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    const senderName = currentUser?.name || currentUser?.username || guestName.trim() || 'Viewer';
    const senderEmail = currentUser?.email || 'guest@zinovis.tv';
    
    setInputText('');

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: SupportMessage = {
      id: tempId,
      userId: effectiveUserId,
      userName: senderName,
      userEmail: senderEmail,
      userAvatar: currentUser?.avatar,
      message: text,
      sender: 'user',
      createdAt: Date.now(),
      read: false,
    };

    // Optimistic instant UI update
    setMessages(prev => [...prev, newMsg]);
    setSending(true);

    try {
      await sendSupportMessageToBackend({
        userId: effectiveUserId,
        userName: senderName,
        userEmail: senderEmail,
        userAvatar: currentUser?.avatar,
        message: text,
        sender: 'user',
        createdAt: Date.now(),
        read: false,
      });
    } catch (err) {
      console.warn('Realtime message dispatch error:', err);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSelectQuickPrompt = (prompt: string) => {
    setInputText(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-950/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-pink-600 p-0.5 shadow-lg shadow-red-500/20 flex-shrink-0">
                <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-red-500" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-neutral-950"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-wide">Zinovis Live Support</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Direct real-time chat with <strong className="text-neutral-200">Admin Rahin</strong></p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Guest Sign-In Notice */}
        {!isLoggedIn && messages.length === 0 && (
          <div className="px-4 py-2.5 bg-neutral-950/70 border-b border-neutral-800 text-xs text-neutral-300 flex items-center justify-between gap-2">
            <span className="text-[11px]">Chatting as Guest. Sign in to keep chat history synced across devices.</span>
            <button
              onClick={() => {
                onClose();
                openAuthModal('login');
              }}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] whitespace-nowrap cursor-pointer transition-all"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-neutral-900/40">
          {/* Welcome Card & Topic Prompts */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 text-xs space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-white">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Real-Time Support Desk</span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Have a question about HD streaming servers, VIP subscription passcodes, subtitle tracks, or want to request a movie? Send a message and Admin Rahin will respond directly.
            </p>

            <div className="pt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectQuickPrompt('Hi Admin Rahin! I need help switching to Server 1 for 1080p Ultra HD streaming.')}
                className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[11px] text-neutral-300 transition-all cursor-pointer"
              >
                📺 Server / Buffering Help
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickPrompt('Hello! I have a question about redeeming my VIP subscription passcode.')}
                className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[11px] text-neutral-300 transition-all cursor-pointer"
              >
                👑 VIP Passcode Inquiry
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickPrompt('Can you please add a new movie or TV series to the library?')}
                className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[11px] text-neutral-300 transition-all cursor-pointer"
              >
                🎬 Request a Movie / Show
              </button>
            </div>
          </div>

          {/* Messages list */}
          {messages.map((msg) => {
            const isAdmin = msg.sender === 'admin';
            const isTemp = msg.id.startsWith('temp_');

            return (
              <div 
                key={msg.id}
                className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'} animate-fadeIn`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-400 px-1">
                  {isAdmin ? (
                    <span className="font-bold text-red-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-red-500" />
                      <span>Admin (Rahin)</span>
                    </span>
                  ) : (
                    <span className="font-semibold text-neutral-300">{msg.userName || 'You'}</span>
                  )}
                  <span>•</span>
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div 
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isAdmin 
                      ? 'bg-neutral-800 text-neutral-100 border border-neutral-700/80 rounded-tl-none shadow-md' 
                      : 'bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-tr-none shadow-lg shadow-red-600/15'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                  
                  <div className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${isAdmin ? 'text-neutral-400' : 'text-red-200'}`}>
                    {isAdmin ? (
                      <span>Official Staff Reply</span>
                    ) : isTemp ? (
                      <span>Sending...</span>
                    ) : (
                      <span className="flex items-center gap-0.5">
                        <CheckCheck className="w-3 h-3 text-red-200" />
                        <span>Delivered</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-800 bg-neutral-950/95 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type your message to Admin Rahin..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-red-500 rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 transition-all flex-shrink-0 cursor-pointer shadow-lg shadow-red-600/20"
            title="Send Message"
          >
            <Send className={`w-4 h-4 ${sending ? 'animate-pulse' : ''}`} />
          </button>
        </form>
      </div>
    </div>
  );
};
