import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import API from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import {
  Send,
  ShieldCheck,
  MessageSquare,
  ExternalLink,
  MoreVertical,
  Ban,
  Flag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Inbox,
  UserX,
  ChevronLeft,
} from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialConversationId = searchParams.get('conversationId');

  const [conversations, setConversations] = useState([]);
  const [inboxTab, setInboxTab] = useState('primary'); // 'primary' | 'requests'
  const [activeConvId, setActiveConvId] = useState(initialConversationId || null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Confirm Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'danger',
    icon: AlertTriangle,
    onConfirm: () => {},
  });

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const currentUserId = (user?._id || user?.id)?.toString();

  // Fetch blocked users
  const fetchBlockedUsers = async () => {
    try {
      const res = await API.get('/chat/blocked-users');
      if (res.data?.success) {
        setBlockedUsers(res.data.blockedUsers || []);
      }
    } catch {
      // Ignore
    }
  };

  // Initialize socket
  useEffect(() => {
    socketRef.current = getSocket();

    socketRef.current.on('receive_message', (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });

      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c._id === newMsg.conversation
            ? { ...c, lastMessage: newMsg, lastMessageAt: new Date() }
            : c
        )
      );
    });

    socketRef.current.on('conversation_accepted', ({ conversationId }) => {
      setConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, status: 'accepted' } : c))
      );
    });

    socketRef.current.on('conversation_declined', ({ conversationId }) => {
      setConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, status: 'declined' } : c))
      );
    });

    socketRef.current.on('user_typing', () => setPartnerTyping(true));
    socketRef.current.on('user_stop_typing', () => setPartnerTyping(false));

    return () => {
      if (socketRef.current && activeConvId) {
        socketRef.current.emit('leave_conversation', { conversationId: activeConvId });
      }
    };
  }, [activeConvId]);

  // Fetch all user conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await API.get('/chat/conversations');
        if (res.data?.success) {
          const list = res.data.conversations || [];
          setConversations(list);
          if (!activeConvId && list.length > 0) {
            setActiveConvId(list[0]._id);
          }
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoadingConvs(false);
      }
    };
    if (user) {
      fetchConversations();
      fetchBlockedUsers();
    }
  }, [user]);

  // Join socket room and load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;

    if (socketRef.current) {
      socketRef.current.emit('join_conversation', { conversationId: activeConvId });
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await API.get(`/chat/conversations/${activeConvId}/messages`);
        if (res.data?.success) {
          setMessages(res.data.messages || []);
          if (res.data.conversation) {
            setConversations((prev) =>
              prev.map((c) => (c._id === activeConvId ? { ...c, ...res.data.conversation } : c))
            );
          }
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeConvId]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConversation = conversations.find((c) => c._id === activeConvId);

  const getOtherParticipant = (conv) => {
    if (!conv?.participants || !user) return { name: 'Seller' };
    return (
      conv.participants.find((p) => (p._id || p.id)?.toString() !== currentUserId) ||
      conv.participants[0]
    );
  };

  const otherUser = getOtherParticipant(activeConversation);
  const otherUserId = (otherUser?._id || otherUser?.id)?.toString();
  const isOtherUserBlocked = blockedUsers.some(
    (b) => (b._id || b.id || b)?.toString() === otherUserId
  );

  // TikTok Message Request Logic:
  // Is this conversation pending acceptance?
  const isPending = activeConversation?.status === 'pending';
  // Am I the recipient who needs to accept/decline?
  const amIReceiver =
    (activeConversation?.receiver?._id || activeConversation?.receiver)?.toString() === currentUserId;
  // Am I the initiator who sent the request?
  const amIInitiator =
    (activeConversation?.initiator?._id || activeConversation?.initiator)?.toString() === currentUserId;
  // How many messages has the initiator sent so far?
  const senderMessageCount =
    activeConversation?.senderMessageCount ||
    messages.filter(
      (m) => (m.sender?._id || m.sender?.id || m.sender)?.toString() === currentUserId
    ).length;
  const isSenderLimitReached = isPending && amIInitiator && senderMessageCount >= 5;

  // Split conversations into Primary vs Requests
  const requestsConversations = conversations.filter((c) => {
    const receiverId = (c.receiver?._id || c.receiver)?.toString();
    return c.status === 'pending' && receiverId === currentUserId;
  });

  const primaryConversations = conversations.filter((c) => {
    const receiverId = (c.receiver?._id || c.receiver)?.toString();
    return c.status === 'accepted' || receiverId !== currentUserId;
  });

  const displayedConversations =
    inboxTab === 'requests' ? requestsConversations : primaryConversations;

  // Handle Send Message (Single HTTP post, no socket duplicate)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConvId || !user || isSenderLimitReached || isOtherUserBlocked) {
      return;
    }

    const text = messageText.trim();
    setMessageText('');

    try {
      const res = await API.post(`/chat/conversations/${activeConvId}/messages`, { content: text });
      if (res.data?.success && res.data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.data.message._id)) return prev;
          return [...prev, res.data.message];
        });

        // Update active conversation count/status
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeConvId
              ? {
                  ...c,
                  status: res.data.conversationStatus || c.status,
                  senderMessageCount: res.data.senderMessageCount ?? (c.senderMessageCount || 0) + 1,
                  lastMessage: res.data.message,
                  lastMessageAt: new Date(),
                }
              : c
          )
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message');
    }
  };

  // Accept Message Request (TikTok style)
  const handleAcceptRequest = async () => {
    setActionLoading(true);
    try {
      const res = await API.patch(`/chat/conversations/${activeConvId}/accept`);
      if (res.data?.success) {
        setConversations((prev) =>
          prev.map((c) => (c._id === activeConvId ? { ...c, status: 'accepted' } : c))
        );
      }
    } catch {
      alert('Failed to accept message request');
    } finally {
      setActionLoading(false);
    }
  };

  // Decline Message Request
  const handleDeclineRequest = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Decline Message Request?',
      message: `${otherUser?.name || 'This user'} will no longer be able to message you in this conversation.`,
      confirmText: 'Decline Request',
      variant: 'danger',
      icon: XCircle,
      onConfirm: async () => {
        try {
          const res = await API.patch(`/chat/conversations/${activeConvId}/decline`);
          if (res.data?.success) {
            setConversations((prev) =>
              prev.map((c) => (c._id === activeConvId ? { ...c, status: 'declined' } : c))
            );
          }
        } catch {
          alert('Failed to decline request');
        } finally {
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Block User (Discreet)
  const promptBlockUser = () => {
    setMoreMenuOpen(false);
    setConfirmModalConfig({
      isOpen: true,
      title: `Block ${otherUser?.name || 'User'}?`,
      message:
        'They will no longer be able to message you or view your listings. You can unblock them at any time.',
      confirmText: 'Block User',
      variant: 'danger',
      icon: Ban,
      onConfirm: async () => {
        try {
          await API.post(`/chat/block/${otherUserId}`);
          await fetchBlockedUsers();
        } catch {
          alert('Failed to block user');
        } finally {
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Unblock User
  const handleUnblockUser = async () => {
    try {
      await API.post(`/chat/unblock/${otherUserId}`);
      await fetchBlockedUsers();
    } catch {
      alert('Failed to unblock user');
    }
  };

  return (
    <div className="flex-1 h-full w-full max-w-7xl mx-auto p-2 sm:p-4 md:p-6 overflow-hidden flex flex-col">
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex min-h-0">
        {/* Left Sidebar: Conversations List & TikTok-style Tabs */}
        <aside
          className={`w-full md:w-80 border-r border-slate-200 flex flex-col shrink-0 ${
            activeConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Inbox
            </h2>
          </div>

          {/* TikTok-Style Inbox Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
            <button
              onClick={() => setInboxTab('primary')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                inboxTab === 'primary'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Primary</span>
            </button>

            <button
              onClick={() => setInboxTab('requests')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                inboxTab === 'requests'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Requests</span>
              {requestsConversations.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {requestsConversations.length}
                </span>
              )}
            </button>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingConvs ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading inbox...</div>
            ) : displayedConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">
                  {inboxTab === 'requests' ? 'No pending requests' : 'No conversations yet'}
                </p>
                <p className="text-[11px]">
                  {inboxTab === 'requests'
                    ? 'Unaccepted message requests from new buyers will appear here.'
                    : 'Find an item or service to start chatting!'}
                </p>
              </div>
            ) : (
              displayedConversations.map((conv) => {
                const partner = getOtherParticipant(conv);
                const isSelected = conv._id === activeConvId;

                return (
                  <button
                    key={conv._id}
                    onClick={() => setActiveConvId(conv._id)}
                    className={`w-full p-4 flex items-start gap-3 text-left transition cursor-pointer ${
                      isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                      {partner?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 truncate">{partner?.name}</p>
                        <span className="text-[10px] text-slate-400">
                          {conv.lastMessageAt
                            ? new Date(conv.lastMessageAt).toLocaleDateString([], {
                                month: 'numeric',
                                day: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold text-indigo-600 truncate mt-0.5">
                        {conv.listing?.title || 'Listing'}
                      </p>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[11px] text-slate-500 truncate flex-1 pr-2">
                          {conv.lastMessage?.content || 'Started conversation'}
                        </p>
                        {conv.status === 'pending' && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                            Request
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Pane: Active Chat Window */}
        <section
          className={`flex-1 flex flex-col bg-slate-50/50 min-w-0 h-full overflow-hidden ${
            activeConvId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header with Listing Banner & Discreet More Menu */}
              <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Back to Inbox Button */}
                  <button
                    type="button"
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                    title="Back to Inbox"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    {activeConversation.listing?.images?.[0]?.url ? (
                      <img
                        src={
                          activeConversation.listing.images[0].url.startsWith('http')
                            ? activeConversation.listing.images[0].url
                            : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${activeConversation.listing.images[0].url}`
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        Img
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {otherUser?.name || 'Seller'}
                      </h3>
                      {isOtherUserBlocked && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Blocked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {activeConversation.listing?.title} •{' '}
                      <span className="font-extrabold text-indigo-600">
                        {formatPrice(
                          activeConversation.listing?.price,
                          activeConversation.listing?.priceType
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isOtherUserBlocked ? (
                    <button
                      onClick={handleUnblockUser}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                    >
                      Unblock User
                    </button>
                  ) : (
                    <Link
                      to={`/listing/${activeConversation.listing?._id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <span>View Listing</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}

                  {/* Discreet More Options Dropdown (...) */}
                  <div className="relative">
                    <button
                      onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="More Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {moreMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setMoreMenuOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in">
                          <Link
                            to={`/listing/${activeConversation.listing?._id}`}
                            onClick={() => setMoreMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            View Listing
                          </Link>

                          {!isOtherUserBlocked ? (
                            <button
                              onClick={promptBlockUser}
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold"
                            >
                              <Ban className="w-3.5 h-3.5 text-rose-500" />
                              Block User
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setMoreMenuOpen(false);
                                handleUnblockUser();
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                            >
                              <UserX className="w-3.5 h-3.5 text-indigo-500" />
                              Unblock User
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Safety notice banner inside chat */}
              <div className="bg-amber-50 px-4 py-2 border-b border-amber-200/60 flex items-center gap-2 text-[11px] text-amber-900 shrink-0">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Safety Tip:</strong> Agree on a safe, public meetup place (busy coffee
                  shops or bank lobbies) and inspect the item before transferring any cash.
                </span>
              </div>

              {/* TikTok-style Request Status Alert for Sender */}
              {isPending && amIInitiator && (
                <div className="bg-indigo-50/90 border-b border-indigo-100 px-4 py-2.5 text-xs text-indigo-900 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    <span>
                      Message request pending acceptance. You can send up to 5 messages (
                      <strong>{senderMessageCount}/5 sent</strong>).
                    </span>
                  </div>
                </div>
              )}

              {/* Messages Flow - ONLY this section scrolls vertically */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
                {loadingMessages ? (
                  <div className="text-center py-10 text-xs text-slate-400">Loading conversation...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">
                      No messages yet. Send a greeting to propose a meetup and check availability!
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const senderId = (msg.sender?._id || msg.sender?.id || msg.sender)?.toString();
                    const isMe = Boolean(currentUserId && senderId && senderId === currentUserId);

                    return (
                      <div
                        key={msg._id || i}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                    );
                  })
                )}
                {partnerTyping && (
                  <div className="text-[11px] text-slate-400 italic">
                    {otherUser?.name || 'Someone'} is typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* TikTok-Style Acceptance / Decline Action Bar for Receiver */}
              {isPending && amIReceiver ? (
                <div className="p-4 bg-white border-t border-slate-200 space-y-3 shrink-0">
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-slate-800">
                      Do you want to accept this message request from {otherUser?.name || 'this buyer'}?
                    </p>
                    <p className="text-[11px] text-slate-500">
                      If you accept, they can message you freely and you can reply to negotiate your meetup.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleDeclineRequest}
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4 text-slate-400" />
                      <span>Decline</span>
                    </button>

                    <button
                      onClick={handleAcceptRequest}
                      disabled={actionLoading}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-100 transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{actionLoading ? 'Accepting...' : 'Accept Request'}</span>
                    </button>
                  </div>
                </div>
              ) : isOtherUserBlocked ? (
                /* Blocked Notice Bar */
                <div className="p-4 bg-white border-t border-slate-200 text-center space-y-2 shrink-0">
                  <p className="text-xs font-bold text-slate-700">
                    You have blocked {otherUser?.name || 'this user'}.
                  </p>
                  <button
                    onClick={handleUnblockUser}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
                  >
                    Unblock to Resume Messaging
                  </button>
                </div>
              ) : isSenderLimitReached ? (
                /* 5-Message Limit Reached Notice */
                <div className="p-4 bg-amber-50/80 border-t border-amber-200 text-center space-y-1 shrink-0">
                  <p className="text-xs font-bold text-amber-900">
                    Message limit reached (5/5).
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Waiting for {otherUser?.name || 'the seller'} to accept your message request before you can send more messages.
                  </p>
                </div>
              ) : (
                /* Standard Message Input Box */
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white border-t border-slate-200 shrink-0"
                >
                  <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-500 border border-slate-200">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Message ${otherUser?.name || 'seller'} (ask questions, propose a public meetup)...`}
                      className="flex-1 bg-transparent border-none text-xs text-slate-800 px-3 py-1.5 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-medium">Select a conversation from the left to view messages</p>
            </div>
          )}
        </section>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        variant={confirmModalConfig.variant}
        icon={confirmModalConfig.icon}
      />
    </div>
  );
}
