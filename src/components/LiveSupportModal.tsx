import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Headphones, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Bot,
  User as UserIcon,
  Film,
  Monitor,
  Heart,
  RefreshCw
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

export const LiveSupportModal: React.FC<LiveSupportModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, isLoggedIn, openAuthModal } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive active userId
  const effectiveUserId = currentUser?.id || getPersistentGuestId();

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToUserSupportMessages(effectiveUserId, (msgs) => {
      if (msgs && msgs.length > 0) {
        setMessages((prev) => {
          // Merge by ID to avoid duplicates while keeping optimistic messages
          const existingIds = new Set(msgs.map(m => m.id));
          const optimisticNotYetSynced = prev.filter(m => m.id.startsWith('temp_') && !existingIds.has(m.id));
          return [...msgs, ...optimisticNotYetSynced].sort((a, b) => a.createdAt - b.createdAt);
        });
      }
    });

    return () => unsubscribe();
  }, [isOpen, effectiveUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const triggerAutomatedAssistantReply = (userQuery: string, senderName: string, senderEmail: string) => {
    const q = userQuery.toLowerCase();
    let replyText = '';

    if (q.includes('server') || q.includes('1080p') || q.includes('4k') || q.includes('hd') || q.includes('buffer') || q.includes('switch')) {
      replyText = `Hi ${senderName}! To switch servers, click the "Server" dropdown located above the player controls. Server 1 & Server 2 provide fast 1080p Ultra HD streaming. If one server is slow in your region, switching to Server 2 or 3 will instantly resolve buffering!`;
    } else if (q.includes('safe mode') || q.includes('under 18') || q.includes('18+') || q.includes('filter') || q.includes('parental')) {
      replyText = `Hello! Under 18 Safe Mode filters out R-rated and 18+ content automatically based on the age you set in your profile. You can toggle this anytime in Account Settings -> Safe Mode Filter.`;
    } else if (q.includes('subtitle') || q.includes('language') || q.includes('caption') || q.includes('audio')) {
      replyText = `Great question! You can switch subtitles by clicking the "CC / Subtitles" icon inside the video player toolbar. We support English, Spanish, French, German, and Arabic multi-tracks.`;
    } else if (q.includes('vip') || q.includes('subscription') || q.includes('code') || q.includes('pass') || q.includes('redeem')) {
      replyText = `VIP Subscription passes unlock commercial-free, high-bitrate streaming. You can redeem your 16-character code by clicking your profile icon -> "Redeem Pass", or purchase one directly at our official shop!`;
    } else if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('help')) {
      replyText = `Hello ${senderName}! Admin Rahin and the Zinovis team are here to help. What movie, series, or streaming feature can we assist you with today?`;
    }

    if (replyText) {
      setIsTyping(true);
      setTimeout(async () => {
        setIsTyping(false);
        const adminMsg: SupportMessage = {
          id: `bot_reply_${Date.now()}`,
          userId: effectiveUserId,
          userName: 'Admin Rahin (Support Desk)',
          userEmail: 'support@zinovis.tv',
          message: replyText,
          sender: 'admin',
          createdAt: Date.now(),
          read: true,
        };

        // Optimistically add
        setMessages(prev => [...prev, adminMsg]);

        // Send to backend
        try {
          await sendSupportMessageToBackend(adminMsg);
        } catch {}
      }, 1200);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const senderName = currentUser?.name || currentUser?.username || guestName.trim() || 'Viewer';
    const senderEmail = currentUser?.email || guestEmail.trim() || 'guest@zinovis.tv';
    const msgText = inputText.trim();
    setInputText('');

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: SupportMessage = {
      id: tempId,
      userId: effectiveUserId,
      userName: senderName,
      userEmail: senderEmail,
      userAvatar: currentUser?.avatar,
      message: msgText,
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
        message: msgText,
        sender: 'user',
        createdAt: Date.now(),
        read: false,
      });
    } catch (err) {
      console.warn('Live support dispatch notice:', err);
    } finally {
      setSending(false);
    }

    // Trigger intelligent instant reply if applicable
    triggerAutomatedAssistantReply(msgText, senderName, senderEmail);
  };

  const handleQuickQuestion = async (prompt: string) => {
    const senderName = currentUser?.name || currentUser?.username || guestName.trim() || 'Viewer';
    const senderEmail = currentUser?.email || guestEmail.trim() || 'guest@zinovis.tv';

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: SupportMessage = {
      id: tempId,
      userId: effectiveUserId,
      userName: senderName,
      userEmail: senderEmail,
      userAvatar: currentUser?.avatar,
      message: prompt,
      sender: 'user',
      createdAt: Date.now(),
      read: false,
    };

    setMessages(prev => [...prev, newMsg]);

    try {
      await sendSupportMessageToBackend({
        userId: effectiveUserId,
        userName: senderName,
        userEmail: senderEmail,
        userAvatar: currentUser?.avatar,
        message: prompt,
        sender: 'user',
        createdAt: Date.now(),
        read: false,
      });
    } catch {}

    triggerAutomatedAssistantReply(prompt, senderName, senderEmail);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[580px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-pink-600 p-0.5 shadow-lg shadow-red-500/20 flex-shrink-0">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
                <Headphones className="w-5 h-5 text-red-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-wide">Zinovis Live Support</h3>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Admin Rahin &amp; Instant Assistance Desk</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Guest prompt if not logged in and no messages yet */}
        {!isLoggedIn && messages.length === 0 && (
          <div className="p-3 bg-neutral-950/60 border-b border-neutral-800 text-xs text-neutral-300 flex items-center justify-between gap-2">
            <span>Have an account? Log in to sync chat across devices.</span>
            <button
              onClick={() => {
                onClose();
                openAuthModal('login');
              }}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] whitespace-nowrap"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Welcome Card */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Welcome to Zinovis Instant Assistance</span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Need help with HD streaming servers, audio/subtitles, movie requests, or your 18+ Safe Mode filter settings? Ask below and Admin Rahin will respond live!
            </p>

            <div className="pt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickQuestion('How do I switch to Server 1 for 1080p Ultra HD?')}
                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 text-[10px] text-neutral-300 transition-colors"
              >
                📺 How to switch servers?
              </button>
              <button
                type="button"
                onClick={() => handleQuickQuestion('How does the under 18 safe mode content filter work?')}
                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 text-[10px] text-neutral-300 transition-colors"
              >
                🛡️ Under 18 Safe Mode info
              </button>
              <button
                type="button"
                onClick={() => handleQuickQuestion('Can you add subtitle tracks for my language?')}
                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 text-[10px] text-neutral-300 transition-colors"
              >
                💬 Multi-subtitles query
              </button>
            </div>
          </div>

          {/* Messages list */}
          {messages.map((msg) => {
            const isAdmin = msg.sender === 'admin';
            return (
              <div 
                key={msg.id}
                className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-400">
                  <span>{isAdmin ? 'Admin (Rahin)' : (msg.userName || 'You')}</span>
                  <span>•</span>
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div 
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isAdmin 
                      ? 'bg-neutral-800 text-white border border-neutral-700 rounded-tl-none shadow-md' 
                      : 'bg-red-600 text-white rounded-tr-none shadow-lg shadow-red-600/20'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })}

          {/* Live Typing Indicator */}
          {isTyping && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-400">
                <span>Admin (Rahin)</span>
                <span>•</span>
                <span>typing...</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl text-xs bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center gap-1.5 rounded-tl-none">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-800 bg-neutral-950/90 flex items-center gap-2">
          <input
            type="text"
            placeholder="Type your message to support..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-red-500 rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-all flex-shrink-0"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

