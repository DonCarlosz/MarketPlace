import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import API, { resolveMediaUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/format';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  CheckCircle2,
  MapPin,
  HelpCircle,
  Tag,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'What items are currently available on oBuy?',
  'Find electronics under ₦100,000',
  'How does the zero-fee peer-to-peer policy work?',
  'Where is the safest place to meet a buyer for a TV?',
];

export default function AIAssistantDrawer() {
  const { user } = useAuth();
  const routeLocation = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am your **oBuy AI Assistant**. Ask me anything about our zero-fee trading policies, safe public meetups, or ask me to search active listings and verified sellers across Nigeria!`,
      listings: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const getPosStorageKey = () =>
    typeof window !== 'undefined' && window.innerWidth < 768
      ? 'obuy_ai_pos_v2_mobile'
      : 'obuy_ai_pos_v2_desktop';

  const clampBtnPos = (pos) => {
    if (!pos || typeof window === 'undefined') return null;
    const minTop = 124; // Never overlap Navbar, Safety Banner, Search Bar, or < Back header
    const maxTop = Math.max(minTop, window.innerHeight - (window.innerWidth < 640 ? 132 : 72));
    return {
      left: Math.max(12, Math.min(pos.left, window.innerWidth - 60)),
      top: Math.max(minTop, Math.min(pos.top, maxTop)),
    };
  };

  // Draggable Floating Launcher Position State (per viewport class, defaults cleanly to bottom-right)
  const [btnPos, setBtnPos] = useState(() => {
    try {
      const saved = localStorage.getItem(getPosStorageKey());
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
          return clampBtnPos(parsed);
        }
      }
    } catch {}
    return null;
  });

  // Keep button inside safe viewport zone when screen resizes or switches mobile <-> desktop
  useEffect(() => {
    const onResize = () => {
      try {
        const saved = localStorage.getItem(getPosStorageKey());
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
            setBtnPos(clampBtnPos(parsed));
            return;
          }
        }
      } catch {}
      setBtnPos(null);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialLeft: 0, initialTop: 0 });
  const launcherRef = useRef(null);

  const handlePointerDown = (e) => {
    if (e.button && e.button !== 0) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = launcherRef.current?.getBoundingClientRect();
    if (!rect) return;

    isDraggingRef.current = false;
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialLeft: rect.left,
      initialTop: rect.top,
    };

    const handlePointerMove = (moveEvt) => {
      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;
      const deltaX = curX - dragStartRef.current.startX;
      const deltaY = curY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        isDraggingRef.current = true;
      }

      if (isDraggingRef.current) {
        if (moveEvt.cancelable) moveEvt.preventDefault();

        const btnWidth = launcherRef.current?.offsetWidth || 52;
        const btnHeight = launcherRef.current?.offsetHeight || 52;
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;

        let newLeft = dragStartRef.current.initialLeft + deltaX;
        let newTop = dragStartRef.current.initialTop + deltaY;

        const minTop = 124;
        const bottomMargin = winWidth < 640 ? 76 : 16;
        newLeft = Math.max(12, Math.min(newLeft, winWidth - btnWidth - 12));
        newTop = Math.max(minTop, Math.min(newTop, winHeight - btnHeight - bottomMargin));

        setBtnPos({ left: newLeft, top: newTop });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);

      if (isDraggingRef.current) {
        setBtnPos((current) => {
          if (current) {
            try {
              localStorage.setItem(getPosStorageKey(), JSON.stringify(current));
            } catch {}
          }
          return current;
        });
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: false });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
  };

  const handleLauncherClick = (e) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsOpen(true);
  };

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await API.post('/ai/chat', {
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        context: {
          currentRoute: routeLocation.pathname,
          userName: user?.name,
          userCity: user?.location?.city,
        },
      });

      if (res.data?.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data.reply,
            listings: res.data.listings || [],
          },
        ]);
      } else {
        throw new Error('No reply');
      }
    } catch (err) {
      const apiErrorMsg = err?.response?.data?.message;
      const isRateLimited = err?.response?.status === 429;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isRateLimited && apiErrorMsg
            ? apiErrorMsg
            : `I could not reach the oBuy AI service right now. Check your internet connection and try sending your message again.`,
          listings: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Conversation refreshed! How can I assist you with oBuy today?`,
        listings: [],
      },
    ]);
  };

  // Helper to parse simple bold text and markdown lists cleanly
  const renderFormattedText = (text) => {
    if (!text) return null;

    return text.split('\n').map((line, idx) => {
      if (!line.trim()) return <div key={idx} className="h-1.5" />;

      // Simple bullet or numbered list parsing
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ');
      const numberedMatch = !isBullet ? trimmed.match(/^(\d+\.)\s+(.*)$/) : null;
      const cleanLine = isBullet ? trimmed.slice(2) : numberedMatch ? numberedMatch[2] : line;

      // Parse bold **text**
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

      const content = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
            <span className="text-slate-500 font-bold shrink-0">•</span>
            <span className="flex-1">{content}</span>
          </div>
        );
      }

      if (numberedMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
            <span className="text-slate-600 font-bold shrink-0">{numberedMatch[1]}</span>
            <span className="flex-1">{content}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="leading-relaxed">
          {content}
        </p>
      );
    });
  };

  return (
    <>
      {/* Draggable Floating Pill Launcher */}
      {!isOpen && (
        <div
          ref={launcherRef}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          style={
            btnPos
              ? { position: 'fixed', left: `${btnPos.left}px`, top: `${btnPos.top}px`, zIndex: 40 }
              : undefined
          }
          className={
            btnPos
              ? 'select-none touch-none cursor-grab active:cursor-grabbing'
              : 'fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 select-none touch-none cursor-grab active:cursor-grabbing'
          }
        >
          <button
            type="button"
            onClick={handleLauncherClick}
            aria-label="Ask oBuy AI"
            className="w-12 h-12 rounded-full bg-white hover:bg-brand-50 text-brand-500 border-2 border-brand-200 transition-colors cursor-pointer flex items-center justify-center relative group active:scale-95"
            title="Ask oBuy AI (drag anywhere to move)"
          >
            <Sparkles className="w-5 h-5 text-brand-500 transition-transform group-hover:scale-110" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </button>
        </div>
      )}

      {/* Slide-Over Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/45 z-50 transition-opacity"
        />
      )}

      {/* Slide-Over Drawer Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[450px] bg-white border-l border-slate-200 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm tracking-tight">
                  oBuy AI
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold text-[10px] border border-brand-200">
                  Assistant
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Platform Guide & Conversational Sourcing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResetChat}
              title="Reset Chat"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[92%] space-y-2.5">
                  <div
                    className={`text-xs rounded-2xl p-3.5 ${
                      isUser
                        ? 'bg-emerald-50 text-slate-900 border border-emerald-200/90 rounded-br-sm'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {renderFormattedText(msg.content)}
                  </div>

                  {/* Interactive Mini Listing Cards returned by AI */}
                  {!isUser && msg.listings && msg.listings.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        <span>Matching Active Listings ({msg.listings.length})</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {msg.listings.map((l) => (
                          <Link
                            key={l._id}
                            to={`/listing/${l._id}`}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition bg-white group cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden">
                              {l.image ? (
                                <img
                                  src={resolveMediaUrl(l.image)}
                                  alt={l.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                                  Item
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate transition">
                                {l.title}
                              </h4>

                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-black text-slate-900">
                                  {formatPrice(l.price)}
                                </span>
                                {l.priceType === 'negotiable' && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    (OBO)
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 flex-wrap">
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span>{l.city}</span>
                                </span>
                                <span>•</span>
                                <span className="font-medium text-slate-600">
                                  {l.sellerName}
                                </span>
                                {l.sellerVerified && (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                )}
                              </div>
                            </div>

                            <div className="text-slate-300 group-hover:text-slate-600 shrink-0 pr-1 transition">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-start">
              <div className="p-3 rounded-2xl rounded-bl-sm bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                <span>Thinking and scanning marketplace inventory...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts (when only 1 or 2 messages exist) */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              <span>Suggested Inquiries</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question or find items/sellers..."
              disabled={loading}
              className="flex-1 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 text-slate-900 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-[10px] text-slate-400 text-center mt-2">
            oBuy AI provides verified guidance and live database search.
          </div>
        </div>
      </div>
    </>
  );
}
