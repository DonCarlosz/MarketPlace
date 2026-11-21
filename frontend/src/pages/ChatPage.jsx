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
 Tag,
 MapPin,
 Check,
 X,
 RotateCcw,
 Sparkles,
 Store,
 Shield,
 HelpCircle,
 CheckCircle,
 Star,
 ThumbsUp,
 ThumbsDown,
 Minus,
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

 // In-Chat Offer State
 const [makeOfferModalOpen, setMakeOfferModalOpen] = useState(false);
 const [offerAmount, setOfferAmount] = useState('');
 const [offerNote, setOfferNote] = useState('');
 const [offerSubmitting, setOfferSubmitting] = useState(false);

 // Counter Offer Modal State
 const [counterModalOpen, setCounterModalOpen] = useState(false);
 const [counterMessageId, setCounterMessageId] = useState(null);
 const [counterAmount, setCounterAmount] = useState('');
 const [counterSubmitting, setCounterSubmitting] = useState(false);

 // Safe Meetup Spot Preset Modal State
 const [meetupModalOpen, setMeetupModalOpen] = useState(false);
 const [meetupSubmitting, setMeetupSubmitting] = useState(false);

 // Leave Feedback / Review Modal State (In-Chat)
 const [reviewModalOpen, setReviewModalOpen] = useState(false);
 const [reviewType, setReviewType] = useState('positive');
 const [reviewStars, setReviewStars] = useState(5);
 const [reviewAccuracy, setReviewAccuracy] = useState(5);
 const [reviewCommunication, setReviewCommunication] = useState(5);
 const [reviewPunctuality, setReviewPunctuality] = useState(5);
 const [reviewComment, setReviewComment] = useState('');
 const [reviewSubmitting, setReviewSubmitting] = useState(false);

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

 socketRef.current.on('offer_updated', (updatedMsg) => {
 setMessages((prev) =>
 prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
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

 // Seller vs Buyer Context
 const isListingSeller =
 activeConversation?.listing?.seller?.toString() === currentUserId ||
 (activeConversation?.listing?.seller?._id &&
 activeConversation.listing.seller._id.toString() === currentUserId) ||
 ((activeConversation?.receiver?._id || activeConversation?.receiver)?.toString() === currentUserId &&
 (activeConversation?.initiator?._id || activeConversation?.initiator)?.toString() !== currentUserId);

 // TikTok Message Request Logic
 const isPending = activeConversation?.status === 'pending';
 const amIReceiver =
 (activeConversation?.receiver?._id || activeConversation?.receiver)?.toString() === currentUserId;
 const amIInitiator =
 (activeConversation?.initiator?._id || activeConversation?.initiator)?.toString() === currentUserId;

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

 // Handle Standard Message Send
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

 // Submit In-Chat Price Offer
 const handleMakeOffer = async (e) => {
 e.preventDefault();
 if (!offerAmount || Number(offerAmount) <= 0 || !activeConvId) return;

 setOfferSubmitting(true);
 try {
 const res = await API.post(`/chat/conversations/${activeConvId}/messages`, {
 messageType: 'offer',
 offer: {
 amount: Number(offerAmount),
 note: offerNote.trim(),
 },
 });

 if (res.data?.success && res.data.message) {
 setMessages((prev) => {
 if (prev.some((m) => m._id === res.data.message._id)) return prev;
 return [...prev, res.data.message];
 });
 setMakeOfferModalOpen(false);
 setOfferAmount('');
 setOfferNote('');
 }
 } catch (err) {
 alert(err.response?.data?.message || 'Failed to send offer.');
 } finally {
 setOfferSubmitting(false);
 }
 };

 // Submit In-Chat Safe Meetup Preset
 const handleSendMeetupProposal = async (preset) => {
 if (!activeConvId) return;

 setMeetupSubmitting(true);
 try {
 const res = await API.post(`/chat/conversations/${activeConvId}/messages`, {
 messageType: 'meetup_proposal',
 meetup: {
 spotName: preset.name,
 spotType: preset.type,
 address: preset.desc,
 },
 });

 if (res.data?.success && res.data.message) {
 setMessages((prev) => {
 if (prev.some((m) => m._id === res.data.message._id)) return prev;
 return [...prev, res.data.message];
 });
 setMeetupModalOpen(false);
 }
 } catch (err) {
 alert(err.response?.data?.message || 'Failed to send meetup proposal.');
 } finally {
 setMeetupSubmitting(false);
 }
 };

 // Respond to Offer (Accept / Decline)
 const handleRespondToOffer = async (messageId, action) => {
 try {
 const res = await API.patch(`/chat/messages/${messageId}/offer`, { action });
 if (res.data?.success) {
 setMessages((prev) =>
 prev.map((m) => (m._id === messageId ? res.data.message : m))
 );
 if (res.data.systemMessage) {
 setMessages((prev) => [...prev, res.data.systemMessage]);
 }
 }
 } catch (err) {
 alert(err.response?.data?.message || 'Failed to process offer response.');
 }
 };

 // Counter Offer Submit
 const handleCounterOfferSubmit = async (e) => {
 e.preventDefault();
 if (!counterAmount || Number(counterAmount) <= 0 || !counterMessageId) return;

 setCounterSubmitting(true);
 try {
 const res = await API.patch(`/chat/messages/${counterMessageId}/offer`, {
 action: 'counter',
 counterAmount: Number(counterAmount),
 });

 if (res.data?.success) {
 setMessages((prev) =>
 prev.map((m) => (m._id === counterMessageId ? res.data.message : m))
 );
 if (res.data.systemMessage) {
 setMessages((prev) => [...prev, res.data.systemMessage]);
 }
 setCounterModalOpen(false);
 setCounterAmount('');
 setCounterMessageId(null);
 }
 } catch (err) {
 alert(err.response?.data?.message || 'Failed to send counter offer.');
 } finally {
 setCounterSubmitting(false);
 }
 };

 // Mark Listing as Sold (Seller live deal completion)
 const handleMarkListingSold = async (listingId) => {
 if (!listingId) return;
 try {
 const res = await API.patch(`/listings/${listingId}/status`, { status: 'sold' });
 if (res.data?.success) {
 setConversations((prev) =>
 prev.map((c) =>
 c._id === activeConvId
 ? { ...c, listing: { ...c.listing, status: 'sold' } }
 : c
 )
 );
 alert('Listing has been marked as sold! Your completed deals counter has been updated.');
 }
 } catch {
 alert('Failed to update listing status');
 }
 };

 // Submit In-Chat Seller Feedback (Buyer live review submission)
 const handleSubmitReview = async (e) => {
 e.preventDefault();
 if (!reviewComment.trim() || !otherUserId) {
 alert('Please provide feedback comments.');
 return;
 }

 setReviewSubmitting(true);
 try {
 const res = await API.post(`/users/${otherUserId}/reviews`, {
 listingId: activeConversation?.listing?._id,
 ratingType: reviewType,
 stars: reviewStars,
 itemAccuracy: reviewAccuracy,
 communication: reviewCommunication,
 punctuality: reviewPunctuality,
 comment: reviewComment.trim(),
 });

 if (res.data?.success) {
 alert('Feedback submitted successfully! The seller score and 12-month scorecard have been updated.');
 setReviewModalOpen(false);
 setReviewComment('');
 }
 } catch (err) {
 alert(err.response?.data?.message || 'Failed to submit feedback.');
 } finally {
 setReviewSubmitting(false);
 }
 };

 // Accept Message Request
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

 // Block User
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

 const listingPrice = Number(activeConversation?.listing?.price) || 0;

 // Safe Meetup Presets
 const safeMeetupPresets = [
 {
 name: 'Busy Shopping Mall / Commercial Plaza',
 type: 'mall',
 desc: 'Main public entrance or well-lit food court area with security present.',
 },
 {
 name: 'Bank Lobby / ATM Gallery',
 type: 'bank',
 desc: 'Active commercial bank branch lobby or ATM area with CCTV surveillance.',
 },
 {
 name: 'Popular Café or Fast Food Eatery',
 type: 'cafe',
 desc: 'Busy eatery (e.g. Chicken Republic, Mega Chicken, Café) during daylight hours.',
 },
 {
 name: 'Police Station / Civic Center Gate',
 type: 'station',
 desc: 'Public visitor parking or front gate area of local police division.',
 },
 ];

 return (
 <div className="flex-1 h-full w-full max-w-7xl mx-auto p-2 sm:p-4 md:p-6 overflow-hidden flex flex-col">
 <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden flex min-h-0">
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
 ? 'bg-white text-indigo-700 '
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
 ? 'bg-white text-indigo-700 '
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
 {/* Pinned Listing Header with Dual Actions & Offer CTA */}
 <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
 <div className="flex items-center gap-2.5 min-w-0">
 {/* Mobile Back Button */}
 <button
 type="button"
 onClick={() => setActiveConvId(null)}
 className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
 title="Back to Inbox"
 >
 <ChevronLeft className="w-5 h-5" />
 </button>

 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
 {activeConversation.listing?.images?.[0]?.url ? (
 <img
 src={
 activeConversation.listing.images[0].url.startsWith('http')
 ? activeConversation.listing.images[0].url
 : `${import.meta.env.VITE_API_URL?.replace('/api', '') || (import.meta.env.PROD ? 'https://marketplace-5wy3.onrender.com' : 'http://localhost:5000')}${activeConversation.listing.images[0].url}`
 }
 alt=""
 className="w-full h-full object-cover"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
 Item
 </div>
 )}
 </div>

 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <Link
 to={otherUserId ? `/profile/${otherUserId}` : '#'}
 className="text-xs sm:text-sm font-bold text-slate-900 truncate hover:text-indigo-600 transition"
 >
 {otherUser?.name || 'Member'}
 </Link>
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
 {/* Make Offer Button for Buyer */}
 {!isListingSeller && !isOtherUserBlocked && (
 <button
 onClick={() => setMakeOfferModalOpen(true)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition cursor-pointer"
 >
 <Tag className="w-3.5 h-3.5" />
 <span className="hidden sm:inline">Make Offer</span>
 <span className="sm:hidden">Offer</span>
 </button>
 )}

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
 className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50"
 >
 <span>View Listing</span>
 <ExternalLink className="w-3 h-3" />
 </Link>
 )}

 {/* Options Menu */}
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
 <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in">
 <Link
 to={`/listing/${activeConversation.listing?._id}`}
 onClick={() => setMoreMenuOpen(false)}
 className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
 >
 <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
 View Listing
 </Link>

 {otherUserId && (
 <Link
 to={`/profile/${otherUserId}`}
 onClick={() => setMoreMenuOpen(false)}
 className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
 >
 <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
 View Seller Scorecard
 </Link>
 )}

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

 {/* Safety notice banner */}
 <div className="bg-amber-50 px-4 py-2 border-b border-amber-200/60 flex items-center justify-between text-[11px] text-amber-900 shrink-0">
 <div className="flex items-center gap-2">
 <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
 <span>
 <strong>Safety Rule:</strong> Inspect item in person at a busy public spot before making payment.
 </span>
 </div>
 <button
 type="button"
 onClick={() => setMeetupModalOpen(true)}
 className="font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
 >
 <MapPin className="w-3 h-3 text-amber-600" />
 <span>Pick Safe Spot</span>
 </button>
 </div>

 {/* TikTok-style Request Status Alert */}
 {isPending && amIInitiator && (
 <div className="bg-indigo-50/90 border-b border-indigo-100 px-4 py-2 text-xs text-indigo-900 flex items-center justify-between gap-3 shrink-0">
 <div className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
 <span>
 Message request pending acceptance ({senderMessageCount}/5 sent).
 </span>
 </div>
 </div>
 )}

 {/* Messages Flow */}
 <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
 {loadingMessages ? (
 <div className="text-center py-10 text-xs text-slate-400">Loading conversation...</div>
 ) : messages.length === 0 ? (
 <div className="text-center py-12 text-slate-400 space-y-2">
 <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
 <p className="text-xs">
 No messages yet. Send a greeting or propose a price offer to start!
 </p>
 </div>
 ) : (
 messages.map((msg, i) => {
 const senderId = (msg.sender?._id || msg.sender?.id || msg.sender)?.toString();
 const isMe = Boolean(currentUserId && senderId && senderId === currentUserId);

 // 1. Render System Message
 if (msg.messageType === 'system') {
 return (
 <div key={msg._id || i} className="flex justify-center my-2">
 <span className="text-[11px] font-semibold text-slate-500 bg-slate-100/90 border border-slate-200 px-3.5 py-1 rounded-full">
 {msg.content}
 </span>
 </div>
 );
 }

 // 2. Render Interactive In-Chat Offer Message Card
 if (msg.messageType === 'offer') {
 const offerStatus = msg.offer?.status || 'pending';
 const offerVal = Number(msg.offer?.amount) || 0;
 const counterVal = Number(msg.offer?.counterAmount) || 0;

 return (
 <div
 key={msg._id || i}
 className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
 >
 <div
 className={`max-w-[85%] sm:max-w-[360px] rounded-2xl p-4 space-y-3 border ${
 isMe
 ? 'bg-indigo-900 text-white border-indigo-800'
 : 'bg-white text-slate-900 border-indigo-200'
 }`}
 >
 {/* Offer Card Header */}
 <div className="flex items-center justify-between border-b border-white/20 pb-2">
 <span className="text-xs font-bold flex items-center gap-1.5">
 <Tag className="w-3.5 h-3.5 text-amber-300" />
 <span>In-Chat Price Offer</span>
 </span>
 <span
 className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
 offerStatus === 'accepted'
 ? 'bg-emerald-500 text-white'
 : offerStatus === 'declined'
 ? 'bg-rose-500 text-white'
 : offerStatus === 'countered'
 ? 'bg-amber-500 text-white'
 : 'bg-amber-400 text-slate-900'
 }`}
 >
 {offerStatus}
 </span>
 </div>

 {/* Large Naira Offer Amount */}
 <div>
 <span className="text-[10px] block opacity-80 uppercase tracking-wider font-semibold">
 {isMe ? 'You Offered:' : 'Buyer Offered:'}
 </span>
 <div className="text-xl sm:text-2xl font-black text-emerald-400">
 ₦{offerVal.toLocaleString()} NGN
 </div>
 {msg.offer?.note && (
 <p className="text-xs italic opacity-90 mt-1">"{msg.offer.note}"</p>
 )}
 </div>

 {/* Counter Offer Info if present */}
 {offerStatus === 'countered' && counterVal > 0 && (
 <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-xs">
 <span className="text-[10px] uppercase font-bold text-amber-300 block">
 Counter Proposal:
 </span>
 <span className="text-base font-black text-amber-300">
 ₦{counterVal.toLocaleString()} NGN
 </span>
 </div>
 )}

 {/* Seller Action Buttons for Pending Offer */}
 {isListingSeller && offerStatus === 'pending' && (
 <div className="flex items-center gap-2 pt-1">
 <button
 type="button"
 onClick={() => handleRespondToOffer(msg._id, 'accept')}
 className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
 >
 <Check className="w-3.5 h-3.5" />
 <span>Accept</span>
 </button>

 <button
 type="button"
 onClick={() => {
 setCounterMessageId(msg._id);
 setCounterModalOpen(true);
 }}
 className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
 >
 <RotateCcw className="w-3.5 h-3.5" />
 <span>Counter</span>
 </button>

 <button
 type="button"
 onClick={() => handleRespondToOffer(msg._id, 'decline')}
 className="py-1.5 px-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition flex items-center justify-center cursor-pointer"
 title="Decline"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 )}

 {/* Buyer Action Buttons for Countered Offer */}
 {!isListingSeller && offerStatus === 'countered' && (
 <div className="flex items-center gap-2 pt-1">
 <button
 type="button"
 onClick={() => handleRespondToOffer(msg._id, 'accept')}
 className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
 >
 <Check className="w-3.5 h-3.5" />
 <span>Accept Counter</span>
 </button>
 <button
 type="button"
 onClick={() => handleRespondToOffer(msg._id, 'decline')}
 className="py-1.5 px-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition flex items-center justify-center cursor-pointer"
 >
 <X className="w-3.5 h-3.5" />
 <span>Decline</span>
 </button>
 </div>
 )}

 {/* Accepted Banner & Deal Actions */}
 {offerStatus === 'accepted' && (
 <div className="space-y-2 pt-1">
 <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
 <span>Deal agreed! Pick a safe public meetup spot below.</span>
 </div>

 {isListingSeller ? (
 activeConversation?.listing?.status === 'sold' ? (
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/30 border border-emerald-400/50 text-[11px] font-bold text-emerald-200">
 <CheckCircle className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
 <span>Listing Marked as Sold (Deal Completed)</span>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => handleMarkListingSold(activeConversation?.listing?._id)}
 className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
 >
 <CheckCircle className="w-3.5 h-3.5" />
 <span>Mark Listing as Sold</span>
 </button>
 )
 ) : (
 <button
 type="button"
 onClick={() => setReviewModalOpen(true)}
 className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
 >
 <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
 <span>Leave Seller Feedback</span>
 </button>
 )}
 </div>
 )}
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
 }

 // 3. Render Safe Meetup Proposal Message Card
 if (msg.messageType === 'meetup_proposal') {
 return (
 <div
 key={msg._id || i}
 className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
 >
 <div
 className={`max-w-[85%] sm:max-w-[340px] rounded-2xl p-4 space-y-2.5 border ${
 isMe
 ? 'bg-indigo-600 text-white border-indigo-700'
 : 'bg-white text-slate-800 border-indigo-200'
 }`}
 >
 <div className="flex items-center gap-1.5 text-xs font-bold">
 <MapPin className="w-4 h-4 text-amber-300" />
 <span>Safe Public Meetup Proposal</span>
 </div>

 <div className="text-sm font-black text-slate-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200/70">
 {msg.meetup?.spotName || 'Designated Public Location'}
 {msg.meetup?.address && (
 <span className="block text-[11px] font-normal text-slate-600 mt-0.5">
 {msg.meetup.address}
 </span>
 )}
 </div>

 <p className="text-[10px] opacity-80 leading-relaxed">
 Inspect item before hand-delivery or instant bank transfer. Never wire funds upfront.
 </p>
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
 }

 // 4. Standard Text Bubble
 return (
 <div
 key={msg._id || i}
 className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
 >
 <div
 className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
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

 {/* TikTok Acceptance Action Bar */}
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
 className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5"
 >
 <CheckCircle2 className="w-4 h-4" />
 <span>{actionLoading ? 'Accepting...' : 'Accept Request'}</span>
 </button>
 </div>
 </div>
 ) : isOtherUserBlocked ? (
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
 <div className="p-4 bg-amber-50/80 border-t border-amber-200 text-center space-y-1 shrink-0">
 <p className="text-xs font-bold text-amber-900">
 Message limit reached (5/5).
 </p>
 <p className="text-[11px] text-amber-700">
 Waiting for {otherUser?.name || 'the seller'} to accept your message request before sending more.
 </p>
 </div>
 ) : (
 /* Message Input + Quick Actions */
 <div className="p-3 bg-white border-t border-slate-200 space-y-2 shrink-0">
 {/* Quick Action Chips Bar */}
 <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
 {!isListingSeller && (
 <button
 type="button"
 onClick={() => setMakeOfferModalOpen(true)}
 className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 text-[11px] shrink-0 transition"
 >
 <Tag className="w-3 h-3" />
 <span>Make Offer</span>
 </button>
 )}

 <button
 type="button"
 onClick={() => setMeetupModalOpen(true)}
 className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 text-[11px] shrink-0 transition"
 >
 <MapPin className="w-3 h-3 text-amber-600" />
 <span>Suggest Meetup Spot</span>
 </button>
 </div>

 <form onSubmit={handleSendMessage} className="flex items-center gap-2">
 <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-500 border border-slate-200">
 <input
 type="text"
 value={messageText}
 onChange={(e) => setMessageText(e.target.value)}
 placeholder={`Message ${otherUser?.name || 'user'} (agree on price, test item, coordinate meetup)...`}
 className="flex-1 bg-transparent border-none text-xs text-slate-800 px-3 py-1.5 focus:outline-none"
 />
 <button
 type="submit"
 disabled={!messageText.trim()}
 className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition "
 >
 <Send className="w-4 h-4" />
 </button>
 </div>
 </form>
 </div>
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

 {/* Make In-Chat Offer Modal */}
 {makeOfferModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
 <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-100 relative">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <div className="flex items-center gap-2">
 <Tag className="w-5 h-5 text-indigo-600" />
 <h3 className="text-base font-black text-slate-900">Make a Price Offer</h3>
 </div>
 <button
 onClick={() => setMakeOfferModalOpen(false)}
 className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleMakeOffer} className="space-y-4">
 <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
 <div>
 <span className="text-[10px] uppercase font-bold text-slate-400 block">Listing Price</span>
 <span className="text-base font-black text-slate-900">
 ₦{listingPrice.toLocaleString()} NGN
 </span>
 </div>
 <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
 Offers Welcome
 </span>
 </div>

 {/* Quick % Discount Chips */}
 {listingPrice > 0 && (
 <div>
 <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
 Quick Preset Discounts
 </label>
 <div className="grid grid-cols-3 gap-2">
 {[5, 10, 15].map((pct) => {
 const discountedVal = Math.round(listingPrice * (1 - pct / 100));
 return (
 <button
 key={pct}
 type="button"
 onClick={() => setOfferAmount(discountedVal.toString())}
 className="p-2 rounded-xl border border-slate-200 text-center hover:bg-indigo-50 hover:border-indigo-200 transition cursor-pointer"
 >
 <span className="block text-[10px] font-bold text-indigo-600">{pct}% Off</span>
 <span className="text-xs font-black text-slate-900">
 ₦{discountedVal.toLocaleString()}
 </span>
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* Custom Naira Amount */}
 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 Your Offer Amount (₦ NGN)
 </label>
 <div className="relative">
 <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₦</span>
 <input
 type="number"
 value={offerAmount}
 onChange={(e) => setOfferAmount(e.target.value)}
 placeholder="e.g. 150000"
 required
 min="1"
 className="w-full text-xs font-bold pl-8 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
 />
 </div>
 </div>

 {/* Optional Note */}
 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 Optional Note to Seller
 </label>
 <input
 type="text"
 value={offerNote}
 onChange={(e) => setOfferNote(e.target.value)}
 placeholder="e.g. Ready to meet today at the mall with cash/transfer."
 className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
 />
 </div>

 <div className="flex items-center justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setMakeOfferModalOpen(false)}
 className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={offerSubmitting || !offerAmount}
 className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer "
 >
 <Tag className="w-3.5 h-3.5" />
 <span>{offerSubmitting ? 'Sending...' : 'Send Price Offer'}</span>
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Counter Offer Modal */}
 {counterModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
 <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-100 relative">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <div className="flex items-center gap-2">
 <RotateCcw className="w-5 h-5 text-amber-500" />
 <h3 className="text-base font-black text-slate-900">Propose Counter Offer</h3>
 </div>
 <button
 onClick={() => setCounterModalOpen(false)}
 className="p-1 rounded-full text-slate-400 hover:text-slate-700"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleCounterOfferSubmit} className="space-y-4">
 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 Counter Amount (₦ NGN)
 </label>
 <div className="relative">
 <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₦</span>
 <input
 type="number"
 value={counterAmount}
 onChange={(e) => setCounterAmount(e.target.value)}
 placeholder="e.g. 175000"
 required
 min="1"
 className="w-full text-xs font-bold pl-8 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200"
 />
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setCounterModalOpen(false)}
 className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={counterSubmitting || !counterAmount}
 className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer "
 >
 <RotateCcw className="w-3.5 h-3.5" />
 <span>{counterSubmitting ? 'Proposing...' : 'Send Counter Offer'}</span>
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Safe Meetup Spot Preset Modal */}
 {meetupModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
 <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-100 relative">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <div className="flex items-center gap-2">
 <MapPin className="w-5 h-5 text-indigo-600" />
 <h3 className="text-base font-black text-slate-900">Suggest Safe Public Meetup Spot</h3>
 </div>
 <button
 onClick={() => setMeetupModalOpen(false)}
 className="p-1 rounded-full text-slate-400 hover:text-slate-700"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <p className="text-xs text-slate-500">
 Pick a designated high-visibility location to suggest in the chat. Both parties can inspect goods safely.
 </p>

 <div className="space-y-2.5">
 {safeMeetupPresets.map((preset, idx) => (
 <button
 key={idx}
 type="button"
 onClick={() => handleSendMeetupProposal(preset)}
 disabled={meetupSubmitting}
 className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition cursor-pointer space-y-0.5"
 >
 <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
 <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
 <span>{preset.name}</span>
 </span>
 <span className="text-[11px] text-slate-500 block pl-5">{preset.desc}</span>
 </button>
 ))}
 </div>

 <div className="flex justify-end pt-2">
 <button
 type="button"
 onClick={() => setMeetupModalOpen(false)}
 className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Leave Seller Feedback Modal */}
 {reviewModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
 <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 my-8">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <div className="flex items-center gap-2">
 <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
 <h3 className="text-base font-black text-slate-900">Leave Seller Feedback</h3>
 </div>
 <button
 type="button"
 onClick={() => setReviewModalOpen(false)}
 className="p-1 rounded-full text-slate-400 hover:text-slate-700"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <p className="text-xs text-slate-500">
 Share your honest experience with {otherUser?.name || 'the seller'}. This directly updates their public reputation score and 12-month scorecard.
 </p>

 <form onSubmit={handleSubmitReview} className="space-y-4">
 {/* Overall Experience Type */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-slate-700">Overall Rating</label>
 <div className="grid grid-cols-3 gap-2">
 <button
 type="button"
 onClick={() => setReviewType('positive')}
 className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
 reviewType === 'positive'
 ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
 : 'border-slate-200 text-slate-600 hover:bg-slate-50'
 }`}
 >
 <ThumbsUp className="w-3.5 h-3.5" />
 <span>Positive</span>
 </button>
 <button
 type="button"
 onClick={() => setReviewType('neutral')}
 className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
 reviewType === 'neutral'
 ? 'border-amber-500 bg-amber-50 text-amber-700'
 : 'border-slate-200 text-slate-600 hover:bg-slate-50'
 }`}
 >
 <Minus className="w-3.5 h-3.5" />
 <span>Neutral</span>
 </button>
 <button
 type="button"
 onClick={() => setReviewType('negative')}
 className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
 reviewType === 'negative'
 ? 'border-rose-500 bg-rose-50 text-rose-700'
 : 'border-slate-200 text-slate-600 hover:bg-slate-50'
 }`}
 >
 <ThumbsDown className="w-3.5 h-3.5" />
 <span>Negative</span>
 </button>
 </div>
 </div>

 {/* Star Rating */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-slate-700">Star Rating ({reviewStars} / 5)</label>
 <div className="flex items-center gap-1.5">
 {[1, 2, 3, 4, 5].map((starVal) => (
 <button
 key={starVal}
 type="button"
 onClick={() => setReviewStars(starVal)}
 className="p-1 cursor-pointer transition hover:scale-110"
 >
 <Star
 className={`w-6 h-6 ${
 starVal <= reviewStars
 ? 'fill-amber-400 text-amber-400'
 : 'text-slate-200'
 }`}
 />
 </button>
 ))}
 </div>
 </div>

 {/* Detailed Breakdown */}
 <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
 <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
 Detailed Criteria
 </span>
 <div className="flex items-center justify-between text-xs">
 <span className="text-slate-700 font-medium">Item Description Accuracy</span>
 <div className="flex gap-1">
 {[1, 2, 3, 4, 5].map((s) => (
 <button
 key={s}
 type="button"
 onClick={() => setReviewAccuracy(s)}
 className={`w-5 h-5 rounded text-[10px] font-bold ${
 s <= reviewAccuracy ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
 }`}
 >
 {s}
 </button>
 ))}
 </div>
 </div>
 <div className="flex items-center justify-between text-xs">
 <span className="text-slate-700 font-medium">Communication</span>
 <div className="flex gap-1">
 {[1, 2, 3, 4, 5].map((s) => (
 <button
 key={s}
 type="button"
 onClick={() => setReviewCommunication(s)}
 className={`w-5 h-5 rounded text-[10px] font-bold ${
 s <= reviewCommunication ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
 }`}
 >
 {s}
 </button>
 ))}
 </div>
 </div>
 <div className="flex items-center justify-between text-xs">
 <span className="text-slate-700 font-medium">Punctuality</span>
 <div className="flex gap-1">
 {[1, 2, 3, 4, 5].map((s) => (
 <button
 key={s}
 type="button"
 onClick={() => setReviewPunctuality(s)}
 className={`w-5 h-5 rounded text-[10px] font-bold ${
 s <= reviewPunctuality ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
 }`}
 >
 {s}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Comments Textarea */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-slate-700">Detailed Feedback</label>
 <textarea
 value={reviewComment}
 onChange={(e) => setReviewComment(e.target.value)}
 placeholder="Describe the transaction, punctuality, and item condition..."
 rows={3}
 required
 className="w-full text-xs rounded-2xl border border-slate-200 p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 />
 </div>

 {/* Submit Buttons */}
 <div className="flex items-center justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setReviewModalOpen(false)}
 className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={reviewSubmitting || !reviewComment.trim()}
 className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
 >
 {reviewSubmitting ? 'Submitting...' : 'Submit Feedback'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

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
