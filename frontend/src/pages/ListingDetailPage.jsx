import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API, { resolveMediaUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { formatPrice } from '../utils/format';
import SafetyBanner from '../components/SafetyBanner';
import ListingCard from '../components/ListingCard';
import {
 MapPin,
 Clock,
 MessageCircle,
 Flag,
 Share2,
 ChevronLeft,
 Eye,
 CheckCircle2,
 Sparkles,
 RefreshCw,
 Wrench,
 Heart,
 Tag,
 ZoomIn,
 X,
 Star,
 ThumbsUp,
 Shield,
 Send,
 ExternalLink,
 AlertTriangle,
 CheckCircle,
} from 'lucide-react';

// Global in-memory cache for instant zero-wait listing recall
const listingDetailCache = new Map();

export default function ListingDetailPage() {
 const { id } = useParams();
 const navigate = useNavigate();
 const { user, openAuthModal } = useAuth();
 const { isFavorite, toggleFavorite } = useFavorites();

 const cachedItem = id ? listingDetailCache.get(id) : null;
 const currentUserId = (user?._id || user?.id)?.toString();

 // Synchronous initialization prevents full-page flash when revisiting a listing
 const [listing, setListing] = useState(() => cachedItem?.listing || null);
 const [relatedListings, setRelatedListings] = useState(() => cachedItem?.related || []);
 const [sellerStats, setSellerStats] = useState(() => cachedItem?.sellerStats || null);
 const [loading, setLoading] = useState(() => !cachedItem);

 const sellerId = (listing?.seller?._id || listing?.seller?.id || listing?.seller)?.toString();
 const isOwnListing = Boolean(currentUserId && sellerId && currentUserId === sellerId);
 const [selectedImageIndex, setSelectedImageIndex] = useState(0);

 // Zoom / Fullscreen lightbox modal
 const [lightboxOpen, setLightboxOpen] = useState(false);

 // Make an Offer modal
 const [offerModalOpen, setOfferModalOpen] = useState(false);
 const [offerAmount, setOfferAmount] = useState('');
 const [offerNote, setOfferNote] = useState('');
 const [offerSubmitting, setOfferSubmitting] = useState(false);
 const [offerSuccess, setOfferSuccess] = useState(false);

 // Report modal
 const [reportModalOpen, setReportModalOpen] = useState(false);
 const [reportReason, setReportReason] = useState('spam');
 const [reportDetails, setReportDetails] = useState('');
 const [reportSuccess, setReportSuccess] = useState(false);
 const [actionLoading, setActionLoading] = useState(false);
 const [shareFeedback, setShareFeedback] = useState(false);
 const [statusUpdating, setStatusUpdating] = useState(false);

 const handleToggleOwnStatus = async () => {
 if (!listing?._id) return;
 const nextStatus =
 listing.status === 'active'
 ? listing.mode === 'service'
 ? 'completed'
 : 'sold'
 : 'active';
 setStatusUpdating(true);
 try {
 const res = await API.patch(`/listings/${listing._id}/status`, { status: nextStatus });
 if (res.data?.success) {
 setListing((prev) => (prev ? { ...prev, status: nextStatus } : prev));
 listingDetailCache.delete(listing._id);
 }
 } catch (err) {
 alert(err.response?.data?.message || 'Could not update listing status.');
 } finally {
 setStatusUpdating(false);
 }
 };

 const handleShareListing = async () => {
 const url = window.location.href;
 if (navigator.share) {
 try {
 await navigator.share({
 title: listing?.title || 'oBuy Listing',
 text: `Check out "${listing?.title}" on oBuy`,
 url,
 });
 return;
 } catch {
 // User cancelled native share sheet
 }
 }
 if (navigator.clipboard) {
 try {
 await navigator.clipboard.writeText(url);
 setShareFeedback(true);
 setTimeout(() => setShareFeedback(false), 2000);
 } catch {
 // Ignore clipboard error
 }
 }
 };

 useEffect(() => {
 const cached = id ? listingDetailCache.get(id) : null;
 if (cached) {
 setListing(cached.listing);
 setRelatedListings(cached.related || []);
 setSellerStats(cached.sellerStats || null);
 setLoading(false);
 } else {
 setLoading(true);
 }

 const fetchListing = async () => {
 try {
 const res = await API.get(`/listings/${id}`);
 if (res.data?.success) {
 const fetchedListing = res.data.listing;
 const fetchedStats = res.data.sellerStats || null;
 setListing(fetchedListing);
 setSellerStats(fetchedStats);

 // Fetch related listings
 let related = [];
 try {
 const relatedRes = await API.get('/listings', {
 params: {
 mode: fetchedListing.mode,
 category: fetchedListing.category,
 limit: 8,
 },
 });
 if (relatedRes.data?.success) {
 related = (relatedRes.data.listings || []).filter(
 (item) => item._id !== fetchedListing._id
 );
 setRelatedListings(related);
 }
 } catch {
 // Ignore related fetch failure
 }

 listingDetailCache.set(id, { listing: fetchedListing, related, sellerStats: fetchedStats });
 }
 } catch (err) {
 console.error('Error fetching listing details:', err);
 } finally {
 setLoading(false);
 }
 };
 fetchListing();
 }, [id]);

 const handleStartChat = async () => {
 if (!user) {
 openAuthModal('login');
 return;
 }

 const currentUserId = (user?._id || user?.id)?.toString();
 const sellerId = (listing?.seller?._id || listing?.seller?.id || listing?.seller)?.toString();

 if (currentUserId && sellerId && currentUserId === sellerId) {
 alert('You cannot start a conversation with yourself on your own listing.');
 return;
 }

 setActionLoading(true);
 try {
 const res = await API.post('/chat/conversations', { listingId: listing._id });
 if (res.data?.success && res.data.conversation?._id) {
 navigate(`/messages?conversationId=${res.data.conversation._id}`);
 }
 } catch (err) {
 alert(err.response?.data?.message || 'Failed to open chat');
 } finally {
 setActionLoading(false);
 }
 };

 const handleOpenOfferModal = () => {
 if (!user) {
 openAuthModal('login');
 return;
 }

 const currentUserId = (user?._id || user?.id)?.toString();
 const sellerId = (listing?.seller?._id || listing?.seller?.id || listing?.seller)?.toString();

 if (currentUserId && sellerId && currentUserId === sellerId) {
 alert('You cannot make an offer on your own listing.');
 return;
 }

 // Default offer suggestion: 10% below asking price
 const suggested = Math.round(Number(listing.price || 0) * 0.9);
 setOfferAmount(suggested > 0 ? suggested.toString() : '');
 setOfferModalOpen(true);
 };

 const handleSubmitOffer = async (e) => {
 e.preventDefault();
 if (!offerAmount || Number(offerAmount) <= 0) return;

 setOfferSubmitting(true);
 try {
 // 1. Ensure conversation exists
 const convRes = await API.post('/chat/conversations', { listingId: listing._id });
 const conversationId = convRes.data?.conversation?._id;

 if (conversationId) {
 // 2. Dispatch structured offer message
 const messageText = `🤝 Price Offer: I would like to offer ₦${Number(offerAmount).toLocaleString()}${
 offerNote ? ` ("${offerNote.trim()}")` : ''
 } for "${listing.title}". Let me know if that works for you!`;

 await API.post(`/chat/conversations/${conversationId}/messages`, {
 messageType: 'offer',
 offer: {
 amount: Number(offerAmount),
 note: offerNote.trim(),
 },
 content: messageText,
 });

 setOfferSuccess(true);
 setTimeout(() => {
 setOfferModalOpen(false);
 setOfferSuccess(false);
 navigate(`/messages?conversationId=${conversationId}`);
 }, 1200);
 }
 } catch (err) {
 alert(err.response?.data?.message || 'Failed to submit offer. Please try again.');
 } finally {
 setOfferSubmitting(false);
 }
 };

 const handleReportSubmit = async (e) => {
 e.preventDefault();
 if (!user) {
 openAuthModal('login');
 return;
 }

 try {
 await API.post('/reports', {
 targetType: 'listing',
 targetId: listing._id,
 reason: reportReason,
 details: reportDetails,
 });
 setReportSuccess(true);
 setTimeout(() => {
 setReportModalOpen(false);
 setReportSuccess(false);
 setReportDetails('');
 }, 2000);
 } catch (err) {
 alert('Failed to submit report.');
 }
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-slate-50 flex items-center justify-center">
 <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
 </div>
 );
 }

 if (!listing) {
 return (
 <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
 <h2 className="text-xl font-bold text-slate-800">Listing Not Found</h2>
 <p className="text-sm text-slate-500 mt-1 mb-4">This listing may have been sold or removed.</p>
 <Link to="/market" className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl ">
 Back to Browse Market
 </Link>
 </div>
 );
 }

 const images =
 listing.images?.length > 0
 ? listing.images.map((img) =>
 resolveMediaUrl(
 img.url,
 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=1000&q=80'
 )
 )
 : ['https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=1000&q=80'];

 const specificEntries =
 listing.itemSpecifics && typeof listing.itemSpecifics === 'object'
 ? Object.entries(listing.itemSpecifics).filter(([, v]) => v && String(v).trim() !== '')
 : [];

 const discountChips = [
 { label: '-5%', val: Math.round(Number(listing.price || 0) * 0.95) },
 { label: '-10%', val: Math.round(Number(listing.price || 0) * 0.9) },
 { label: '-15%', val: Math.round(Number(listing.price || 0) * 0.85) },
 ];

 return (
 <div className="min-h-screen bg-slate-50 pb-20">
 <SafetyBanner />

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
 {/* Breadcrumb Navigation */}
 <div className="flex items-center justify-between mb-4 flex-wrap gap-2 text-xs text-slate-500">
 <div className="flex items-center gap-1.5 flex-wrap">
 <Link to="/market" className="hover:text-indigo-600 font-semibold transition">
 Market
 </Link>
 <span>/</span>
 <span className="font-semibold text-slate-700">{listing.category}</span>
 <span>/</span>
 <span className="text-slate-400 line-clamp-1 max-w-[240px] sm:max-w-xs">{listing.title}</span>
 </div>

 <Link
 to="/market"
 className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
 >
 <ChevronLeft className="w-4 h-4" />
 <span>Back to listings</span>
 </Link>
 </div>

 {/* Main 2-Column Product Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
 {/* Left Column: Multi-Image Zoom Gallery & Structured Details (7 cols) */}
 <div className="lg:col-span-7 space-y-6">
 {/* Image Gallery Card */}
 <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden p-3.5">
 {/* Main Image Viewport */}
 <div
 onClick={() => setLightboxOpen(true)}
 className="aspect-[16/11] bg-slate-50 rounded-2xl overflow-hidden relative flex items-center justify-center border border-slate-100 group cursor-zoom-in"
 >
 <img
 src={images[selectedImageIndex]}
 alt={listing.title}
 className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
 decoding="async"
 />

 {/* Mode Tag */}
 <div className="absolute top-3 left-3 z-10">
 {listing.mode === 'new' && (
 <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full ">
 <Sparkles className="w-3.5 h-3.5" /> Brand New
 </span>
 )}
 {listing.mode === 'service' && (
 <span className="inline-flex items-center gap-1 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full ">
 <Wrench className="w-3.5 h-3.5" /> Local Handwork
 </span>
 )}
 {listing.mode === 'second-hand' && (
 <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full ">
 <RefreshCw className="w-3.5 h-3.5" /> Second-hand
 </span>
 )}
 </div>

 {/* Floating Heart / Wishlist Button */}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 toggleFavorite(listing._id);
 }}
 className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition ${
 isFavorite(listing._id)
 ? 'bg-rose-50 text-rose-600 border border-rose-200'
 : 'bg-white/90 hover:bg-white text-slate-700 hover:text-rose-600 border border-slate-200/80'
 }`}
 title={isFavorite(listing._id) ? 'Remove from favorites' : 'Save to favorites'}
 >
 <Heart className={`w-4 h-4 ${isFavorite(listing._id) ? 'fill-rose-500 text-rose-500' : ''}`} />
 </button>

 {/* Hover Click to Expand Overlay */}
 <div className="absolute bottom-3 right-3 bg-slate-900/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
 <ZoomIn className="w-3.5 h-3.5" />
 <span>Click to expand</span>
 </div>
 </div>

 {/* Thumbnail Strip */}
 {images.length > 1 && (
 <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
 {images.map((img, idx) => (
 <button
 key={idx}
 type="button"
 onClick={() => setSelectedImageIndex(idx)}
 className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-transform cursor-pointer ${
 selectedImageIndex === idx
 ? 'border-indigo-600 ring-2 ring-indigo-200 scale-95'
 : 'border-slate-200 opacity-75 hover:opacity-100'
 }`}
 >
 <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Structured Item Specifics Grid */}
 <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
 Item Specifics & Details
 </h3>

 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
 <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
 <span className="text-slate-400 block font-medium">Condition</span>
 <span className="font-bold text-slate-800 capitalize mt-0.5 block">
 {listing.mode === 'service'
 ? 'Professional Service'
 : listing.condition?.replace('-', ' ') || 'Good (Pre-owned)'}
 </span>
 </div>

 <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
 <span className="text-slate-400 block font-medium">Category</span>
 <span className="font-bold text-slate-800 mt-0.5 block">{listing.category}</span>
 </div>

 <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
 <span className="text-slate-400 block font-medium">Fulfillment</span>
 <span className="font-bold text-emerald-700 mt-0.5 block">
 {listing.allowsDelivery ? 'Meetup & Local Delivery' : 'Direct Meetup'}
 </span>
 </div>

 <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
 <span className="text-slate-400 block font-medium">Payment Model</span>
 <span className="font-bold text-slate-800 mt-0.5 block">Inspect Before Paying</span>
 </div>

 <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
 <span className="text-slate-400 block font-medium">Location</span>
 <span className="font-bold text-slate-800 mt-0.5 block truncate">
 {listing.location?.neighborhood
 ? `${listing.location.neighborhood}, ${listing.location.city}`
 : listing.location?.city || 'Nigeria'}
 </span>
 </div>

 <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
 <span className="text-slate-400 block font-medium">Negotiation</span>
 <span className="font-bold text-indigo-700 mt-0.5 block">
 {listing.acceptsOffers !== false ? 'Offers Welcome' : 'Fixed Price'}
 </span>
 </div>

 {/* Dynamic Seller-Provided Item Specifics */}
 {specificEntries.map(([specKey, specVal]) => (
 <div key={specKey} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
 <span className="text-slate-400 block font-medium capitalize">
 {specKey.replace(/([A-Z])/g, ' $1').trim()}
 </span>
 <span className="font-bold text-slate-800 mt-0.5 block truncate">{specVal}</span>
 </div>
 ))}
 </div>

 {/* Honest Flaw Disclosure if provided by seller */}
 {listing.flawDescription && (
 <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-950 space-y-1">
 <p className="font-bold flex items-center gap-1.5 text-amber-900">
 <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
 <span>Seller Flaw & Cosmetic Disclosure</span>
 </p>
 <p className="leading-relaxed">{listing.flawDescription}</p>
 </div>
 )}

 {/* Service Availability note if present */}
 {listing.availabilityNotes && (
 <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-2xl text-xs text-purple-900 space-y-1">
 <p className="font-bold flex items-center gap-1.5">
 <Clock className="w-3.5 h-3.5 text-purple-600" />
 Availability & Scheduling Notes:
 </p>
 <p>{listing.availabilityNotes}</p>
 </div>
 )}

 {/* Description Body */}
 <div className="pt-2">
 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
 Seller Description
 </h4>
 <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
 {listing.description}
 </p>
 </div>

 {/* Preferred Meetup Guidelines Card */}
 <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-1.5">
 <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
 <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
 <span>Seller's Preferred Meetup Spot</span>
 </h4>
 <p className="text-xs text-emerald-800">
 {listing.preferredMeetup ||
 'Public meetup location (busy shopping plaza, supermarket parking, mall entrance, or bank security post).'}
 </p>
 </div>
 </div>
 </div>

 {/* Right Column: Pricing, Dual CTA, Seller Trust & Guarantees (5 cols) */}
 <div className="lg:col-span-5 space-y-6">
 {/* Pricing & Conversion Card */}
 <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
 {/* Urgency & Social Proof Ribbons */}
 <div className="flex items-center gap-2 flex-wrap">
 <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
 <Eye className="w-3.5 h-3.5 text-slate-500" />
 <span>{(listing.views || 1).toLocaleString()} {listing.views === 1 ? 'view' : 'views'}</span>
 </span>
 {listing.favoritesCount > 0 && (
 <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
 <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
 <span>{listing.favoritesCount} watching</span>
 </span>
 )}
 <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
 <Clock className="w-3 h-3 text-slate-400" />
 <span>Posted {new Date(listing.createdAt).toLocaleDateString()}</span>
 </span>
 </div>

 {/* Title & Price Header */}
 <div>
 <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
 {listing.title}
 </h1>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-3xl sm:text-4xl font-black text-slate-900">
 {formatPrice(listing.price, listing.priceType)}
 </span>
 <span className="text-xs font-bold text-slate-500 uppercase">NGN</span>
 </div>
 </div>

 {/* Action Buttons: Owner Controls OR Buyer Contact + Make Offer */}
 <div className="space-y-2.5 pt-1">
 {isOwnListing ? (
 <>
 <button
 type="button"
 onClick={handleToggleOwnStatus}
 disabled={statusUpdating}
 className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 font-bold text-xs sm:text-sm rounded-2xl transition-colors cursor-pointer disabled:opacity-50 ${
 listing.status === 'active'
 ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
 : 'bg-indigo-600 hover:bg-indigo-700 text-white'
 }`}
 >
 <CheckCircle className="w-4 h-4" />
 <span>
 {statusUpdating
 ? 'Updating...'
 : listing.status === 'active'
 ? `Mark as ${listing.mode === 'service' ? 'Completed' : 'Sold'}`
 : 'Reactivate Listing'}
 </span>
 </button>
 <Link
 to="/profile"
 className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl transition-colors border border-slate-200"
 >
 <span>Manage All My Listings</span>
 <ExternalLink className="w-4 h-4 text-indigo-600" />
 </Link>
 </>
 ) : listing.status !== 'active' ? (
 <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-600 capitalize">
 This listing is currently marked as {listing.status}.
 </div>
 ) : (
 <>
 <button
 type="button"
 onClick={handleStartChat}
 disabled={actionLoading}
 className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl transition-colors cursor-pointer"
 >
 <MessageCircle className="w-4 h-4" />
 <span>
 {actionLoading
 ? 'Connecting...'
 : listing.mode === 'service'
 ? 'Message Provider to Book'
 : 'Message Seller to Meet'}
 </span>
 </button>

 {listing.acceptsOffers !== false && (
 <button
 type="button"
 onClick={handleOpenOfferModal}
 className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl transition-colors border border-slate-200 cursor-pointer"
 >
 <Tag className="w-4 h-4 text-indigo-600" />
 <span>Make an Offer</span>
 </button>
 )}
 </>
 )}
 </div>

 <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
 {!isOwnListing ? (
 <button
 type="button"
 onClick={() => setReportModalOpen(true)}
 className="inline-flex items-center gap-1 hover:text-rose-600 transition-colors cursor-pointer"
 >
 <Flag className="w-3.5 h-3.5" />
 <span>Report</span>
 </button>
 ) : (
 <span className="text-[11px] font-semibold text-indigo-600">Your Listing</span>
 )}

 <button
 type="button"
 onClick={handleShareListing}
 className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
 >
 <Share2 className="w-3.5 h-3.5" />
 <span>{shareFeedback ? 'Link Copied!' : 'Share'}</span>
 </button>
 </div>
 </div>

 {/* Seller Trust & Reputation Card */}
 <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
 {listing.mode === 'service' ? 'Provider Trust & Bio' : 'Seller Trust Score'}
 </h4>
 <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
 <ThumbsUp className="w-3 h-3" />
 <span>
 {sellerStats?.hasReviews
 ? `${sellerStats.positivePercentage}% Positive`
 : listing.seller?.isVerified
 ? 'Verified Member'
 : 'New Seller'}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <Link
 to={sellerId ? `/profile/${sellerId}` : '#'}
 className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-base flex items-center justify-center border border-indigo-200 shrink-0 overflow-hidden hover:opacity-90 transition-opacity"
 >
 {listing.seller?.avatar ? (
 <img
 src={resolveMediaUrl(listing.seller.avatar)}
 alt={listing.seller.name}
 className="w-full h-full object-cover"
 decoding="async"
 />
 ) : (
 listing.seller?.name?.charAt(0).toUpperCase() || 'U'
 )}
 </Link>

 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-1.5">
 <Link
 to={sellerId ? `/profile/${sellerId}` : '#'}
 className="font-bold text-slate-900 text-sm truncate hover:text-indigo-600 transition-colors"
 >
 {listing.seller?.name || 'oBuy Seller'}
 </Link>
 {listing.seller?.isVerified && (
 <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" title="Verified Member" />
 )}
 </div>
 <p className="text-xs text-slate-500 truncate">
 {listing.seller?.isVerified ? 'Verified oBuy Member' : 'oBuy Member'} •{' '}
 {listing.location?.city || 'Nigeria'}
 </p>
 </div>
 </div>

 {/* 3-Point Seller Metrics (100% Backend-Driven) */}
 <div className="grid grid-cols-3 gap-2 pt-1 text-center border-t border-slate-100">
 <div className="p-2 bg-slate-50 rounded-xl">
 <span className="text-[10px] text-slate-400 block font-medium">Rating</span>
 <div className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-600">
 <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
 <span>
 {sellerStats?.hasReviews && sellerStats.averageRating != null
 ? `${sellerStats.averageRating.toFixed(1)}`
 : 'New'}
 </span>
 </div>
 </div>
 <div className="p-2 bg-slate-50 rounded-xl">
 <span className="text-[10px] text-slate-400 block font-medium">Deals</span>
 <span className="text-xs font-bold text-slate-800">
 {sellerStats ? `${sellerStats.itemsSoldCount} Sold` : '0 Sold'}
 </span>
 </div>
 <div className="p-2 bg-slate-50 rounded-xl">
 <span className="text-[10px] text-slate-400 block font-medium">Activity</span>
 <span className="text-xs font-bold text-indigo-700 truncate block">
 {sellerStats?.responseBadge || 'New Seller'}
 </span>
 </div>
 </div>

 {listing.seller?.bio && (
 <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
 "{listing.seller.bio}"
 </p>
 )}

 {sellerId && (
 <Link
 to={`/profile/${sellerId}`}
 className="flex items-center justify-center gap-1.5 w-full text-center text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 py-2.5 rounded-xl border border-indigo-200/60 transition-colors"
 >
 <span>View Seller Profile & Scorecard</span>
 <ExternalLink className="w-3.5 h-3.5" />
 </Link>
 )}
 </div>

 {/* oBuy Inspection Guarantee Card */}
 <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-200/80 rounded-3xl p-5 space-y-3">
 <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
 <Shield className="w-4 h-4 text-indigo-600 fill-indigo-100" />
 <span>oBuy Inspection Guarantee</span>
 </div>

 <p className="text-xs text-slate-700 leading-relaxed">
 Meet in person at a public location. Test and inspect the item before making any payment.
 Zero wire transfer risk, zero platform deduction fees.
 </p>

 <div className="pt-1 text-[11px] text-indigo-800 font-semibold space-y-1">
 <div className="flex items-center gap-1.5">
 <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
 <span>Inspect goods physically before paying</span>
 </div>
 <div className="flex items-center gap-1.5">
 <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
 <span>No upfront card charges or bank deposits</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Similar / Related Neighborhood Listings */}
 {relatedListings.length > 0 && (
 <div className="mt-14 pt-8 border-t border-slate-200">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-lg sm:text-xl font-black text-slate-900">
 More in {listing.category}
 </h3>
 <p className="text-xs text-slate-500">Discover other verified deals and handwork nearby</p>
 </div>
 <Link
 to="/market"
 className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
 >
 Browse all in Market →
 </Link>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
 {relatedListings.slice(0, 5).map((item) => (
 <ListingCard key={item._id} listing={item} />
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Lightbox Fullscreen Modal */}
 {lightboxOpen && (
 <div
 className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
 onClick={() => setLightboxOpen(false)}
 >
 <button
 type="button"
 onClick={() => setLightboxOpen(false)}
 className="absolute top-4 right-4 z-50 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
 >
 <X className="w-6 h-6" />
 </button>

 <div
 className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center"
 onClick={(e) => e.stopPropagation()}
 >
 <img
 src={images[selectedImageIndex]}
 alt={listing.title}
 className="max-w-full max-h-[75vh] object-contain rounded-2xl"
 />

 {images.length > 1 && (
 <div className="flex items-center gap-2 mt-4 overflow-x-auto p-1.5 bg-black/60 rounded-2xl">
 {images.map((img, idx) => (
 <button
 key={idx}
 type="button"
 onClick={() => setSelectedImageIndex(idx)}
 className={`w-14 h-12 rounded-xl overflow-hidden border-2 transition-transform cursor-pointer ${
 selectedImageIndex === idx ? 'border-white scale-105' : 'border-transparent opacity-60'
 }`}
 >
 <img src={img} alt="" className="w-full h-full object-cover" decoding="async" />
 </button>
 ))}
 </div>
 )}
 </div>
 </div>
 )}

 {/* Make an Offer Modal */}
 {offerModalOpen && (
 <div
 className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
 onClick={() => setOfferModalOpen(false)}
 >
 <div
 className="relative bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-100"
 onClick={(e) => e.stopPropagation()}
 >
 <button
 type="button"
 onClick={() => setOfferModalOpen(false)}
 className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1"
 >
 <X className="w-5 h-5" />
 </button>

 <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
 <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
 <Tag className="w-5 h-5" />
 </div>
 <div>
 <h3 className="font-bold text-slate-900 text-sm">Make an Offer</h3>
 <p className="text-[11px] text-slate-500">Negotiate a direct price with the seller</p>
 </div>
 </div>

 {offerSuccess ? (
 <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-semibold text-center space-y-1">
 <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
 <p>Offer sent to seller!</p>
 <p className="text-[11px] text-emerald-600 font-normal">Redirecting you to the chat thread...</p>
 </div>
 ) : (
 <form onSubmit={handleSubmitOffer} className="space-y-4">
 <div>
 <div className="flex items-center justify-between text-xs mb-1">
 <span className="text-slate-500 font-medium">Asking Price:</span>
 <span className="font-bold text-slate-900">₦{Number(listing.price || 0).toLocaleString()}</span>
 </div>

 <label className="block text-xs font-bold text-slate-700 mb-1">
 Your Proposed Price (₦)
 </label>
 <input
 type="number"
 value={offerAmount}
 onChange={(e) => setOfferAmount(e.target.value)}
 required
 min={1}
 className="w-full text-base font-bold text-slate-900 border-2 border-indigo-200 focus:border-indigo-600 rounded-2xl p-2.5 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition"
 />
 </div>

 {/* Quick Offer Suggestion Chips */}
 <div>
 <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
 Quick suggestions:
 </span>
 <div className="flex gap-2">
 {discountChips.map((chip) => (
 <button
 key={chip.label}
 type="button"
 onClick={() => setOfferAmount(chip.val.toString())}
 className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
 >
 {chip.label} (₦{chip.val.toLocaleString()})
 </button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 Optional Note to Seller
 </label>
 <textarea
 rows={2}
 value={offerNote}
 onChange={(e) => setOfferNote(e.target.value)}
 placeholder="e.g. Can pick up today with cash in Ikeja..."
 className="w-full text-xs border border-slate-300 rounded-2xl p-2.5 focus:outline-none focus:border-indigo-600 transition"
 ></textarea>
 </div>

 <button
 type="submit"
 disabled={offerSubmitting || !offerAmount}
 className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl transition cursor-pointer flex items-center justify-center gap-2"
 >
 <Send className="w-4 h-4" />
 <span>{offerSubmitting ? 'Sending Offer...' : 'Send Offer to Seller'}</span>
 </button>
 </form>
 )}
 </div>
 </div>
 )}

 {/* Report Modal */}
 {reportModalOpen && (
 <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200">
 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
 <Flag className="w-5 h-5 text-rose-500" />
 Report this Listing
 </h3>

 {reportSuccess ? (
 <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-medium">
 Thank you. Your report has been submitted for review.
 </div>
 ) : (
 <form onSubmit={handleReportSubmit} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
 <select
 value={reportReason}
 onChange={(e) => setReportReason(e.target.value)}
 className="w-full text-xs border border-slate-300 rounded-xl p-2.5"
 >
 <option value="spam">Spam or Duplicate</option>
 <option value="fraud-scam">Suspected Fraud or Scam</option>
 <option value="prohibited-item">Prohibited or Illegal Item/Service</option>
 <option value="inappropriate-content">Inappropriate Content</option>
 <option value="other">Other Violation</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Details</label>
 <textarea
 rows={3}
 value={reportDetails}
 onChange={(e) => setReportDetails(e.target.value)}
 placeholder="Provide additional context to help our moderators..."
 className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none"
 ></textarea>
 </div>

 <div className="flex items-center justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setReportModalOpen(false)}
 className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
 >
 Submit Report
 </button>
 </div>
 </form>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
