import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/format';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  Search,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  ExternalLink,
  HelpCircle,
  Tag,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'What is Timothy selling in Uromi?',
  'Find second-hand laptops under ₦300,000',
  'How does the zero-fee peer-to-peer policy work?',
  'Where is the safest place to meet a buyer for a TV?',
];

export default function AIAssistantDrawer() {
  const { user } = useAuth();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am your **LocalMarket AI Assistant**. Ask me anything about our zero-fee trading policies, safe public meetups, or ask me to search active listings and verified sellers across Nigeria!`,
      listings: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
          currentRoute: location.pathname,
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
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `LocalMarket allows you to buy and sell with zero commission. Always meet locally in well-lit public spots such as bank ATM galleries or supermarket plazas to inspect goods before paying in person.`,
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
        content: `Conversation refreshed! How can I assist you with LocalMarket today?`,
        listings: [],
      },
    ]);
  };

  // Helper to parse simple bold text and markdown lists cleanly
  const renderFormattedText = (text) => {
    if (!text) return null;

    return text.split('\n').map((line, idx) => {
      if (!line.trim()) return <div key={idx} className="h-1.5" />;

      // Simple bullet parsing
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
      const cleanLine = isBullet ? line.trim().slice(2) : line;

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
            <span className="text-indigo-600 font-bold shrink-0">•</span>
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
      {/* Floating Pill Launcher */}
      {!isOpen && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs border border-indigo-500 transition-all cursor-pointer group"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <span>Ask LocalMarket AI</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      )}

      {/* Slide-Over Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
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
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm tracking-tight">
                  LocalMarket AI
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                  Gemini 3.5
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[88%] space-y-2.5`}>
                  <div
                    className={`text-xs rounded-2xl p-3.5 ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    {renderFormattedText(msg.content)}
                  </div>

                  {/* Interactive Mini Listing Cards returned by AI */}
                  {!isUser && msg.listings && msg.listings.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Matching Active Listings ({msg.listings.length})</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {msg.listings.map((l) => (
                          <Link
                            key={l._id}
                            to={`/listing/${l._id}`}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 transition bg-white group cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden">
                              {l.image ? (
                                <img
                                  src={l.image}
                                  alt={l.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                                  Item
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">
                                {l.title}
                              </h4>

                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-black text-indigo-700">
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
                                  <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
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

                            <div className="text-slate-300 group-hover:text-indigo-600 shrink-0 pr-1 transition">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-2xl rounded-tl-xs bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
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
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer text-left"
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
              className="flex-1 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-900 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-[10px] text-slate-400 text-center mt-2">
            LocalMarket AI provides verified guidance and live database search.
          </div>
        </div>
      </div>
    </>
  );
}
