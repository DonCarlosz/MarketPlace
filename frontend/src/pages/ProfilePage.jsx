import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';
import ConfirmModal from '../components/ConfirmModal';
import { formatPrice } from '../utils/format';
import {
 User as UserIcon,
 MapPin,
 Mail,
 Edit3,
 Check,
 Package,
 Trash2,
 CheckCircle,
 Clock,
 Sparkles,
 CheckCircle2,
 ShieldCheck,
 Plus,
 Star,
 ThumbsUp,
 ThumbsDown,
 Minus,
 MessageSquare,
 Heart,
 Award,
 Calendar,
 X,
 Send,
 ExternalLink,
 Camera,
 Loader2,
} from 'lucide-react';

export default function ProfilePage() {
 const { userId } = useParams();
 const { user: currentUser, updateUser, openAuthModal } = useAuth();
 const navigate = useNavigate();

 const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
 const targetUserId = userId || currentUserId;
 const isOwnProfile = !userId || (currentUserId && userId === currentUserId);

 const [profileData, setProfileData] = useState(null);
 const [reputation, setReputation] = useState(null);
 const [listings, setListings] = useState([]);
 const [favorites, setFavorites] = useState([]);
 const [reviews, setReviews] = useState([]);
 const [loading, setLoading] = useState(true);

 // Tab State
 const [tab, setTab] = useState('active'); // 'active' | 'sold' | 'favorites' | 'reviews'

 // Edit Profile State
 const [editing, setEditing] = useState(false);
 const [name, setName] = useState('');
 const [bio, setBio] = useState('');
 const [city, setCity] = useState('');
 const [avatarUrl, setAvatarUrl] = useState('');
 const [avatarUploading, setAvatarUploading] = useState(false);
 const [saveLoading, setSaveLoading] = useState(false);
 const avatarInputRef = useRef(null);

 // Review Modal State
 const [reviewModalOpen, setReviewModalOpen] = useState(false);
 const [reviewType, setReviewType] = useState('positive'); // 'positive' | 'neutral' | 'negative'
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
 onConfirm: () => {},
 });

 // Fetch Profile & Reputation Data
 useEffect(() => {
 if (!targetUserId) {
 if (!currentUser) {
 openAuthModal('login');
 navigate('/');
 }
 return;
 }

 const loadProfile = async () => {
 setLoading(true);
 try {
 // 1. Fetch public profile and 12-month scorecard
 const profRes = await API.get(`/users/${targetUserId}/profile`);
 if (profRes.data?.success) {
 setProfileData(profRes.data.user);
 setReputation(profRes.data.reputation);
 setName(profRes.data.user.name || '');
 setBio(profRes.data.user.bio || '');
 setCity(profRes.data.user.location?.city || '');
 setAvatarUrl(profRes.data.user.avatar || '');
 }

 // 2. Fetch Listings
 if (isOwnProfile) {
 const myListRes = await API.get('/listings/user/my-listings');
 if (myListRes.data?.success) {
 setListings(myListRes.data.listings || []);
 }
 const favRes = await API.get('/listings/user/favorites');
 if (favRes.data?.success) {
 setFavorites(favRes.data.favorites || []);
 }
 } else {
 const publicListRes = await API.get(`/users/${targetUserId}/listings`);
 if (publicListRes.data?.success) {
 setListings(publicListRes.data.listings || []);
 }
 }

 // 3. Fetch Reviews
 const revRes = await API.get(`/users/${targetUserId}/reviews`);
 if (revRes.data?.success) {
 setReviews(revRes.data.reviews || []);
 }
 } catch (err) {
 console.error('Failed to load profile:', err);
 } finally {
 setLoading(false);
 }
 };

 loadProfile();
 }, [targetUserId, isOwnProfile, currentUser]);

 // Handle Avatar Image File Selection
 const handleAvatarChange = async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;

 if (file.size > 10 * 1024 * 1024) {
 alert('Profile picture must be under 10MB.');
 return;
 }

 setAvatarUploading(true);
 try {
 const formData = new FormData();
 formData.append('images', file);
 const res = await API.post('/upload', formData, {
 headers: { 'Content-Type': 'multipart/form-data' },
 });

 if (res.data?.success && res.data.images?.length > 0) {
 const uploadedUrl = res.data.images[0].url;
 setAvatarUrl(uploadedUrl);
 } else {
 alert('Failed to upload image.');
 }
 } catch (err) {
 alert(err.response?.data?.message || 'Failed to upload profile picture.');
 } finally {
 setAvatarUploading(false);
 if (avatarInputRef.current) avatarInputRef.current.value = '';
 }
 };

 // Toggle Edit Mode with Cancel Reset
 const toggleEditing = () => {
 if (editing) {
 setName(profileData?.name || '');
 setBio(profileData?.bio || '');
 setCity(profileData?.location?.city || '');
 setAvatarUrl(profileData?.avatar || '');
 setEditing(false);
 } else {
 setEditing(true);
 }
 };

 // Handle Save Own Profile
 const handleSaveProfile = async (e) => {
 e.preventDefault();
 setSaveLoading(true);
 try {
 const res = await API.put('/auth/me', {
 name: name.trim(),
 bio: bio.trim(),
 city: city.trim(),
 avatar: avatarUrl,
 });
 if (res.data?.success) {
 updateUser(res.data.user);
 setProfileData((prev) => ({
 ...prev,
 name: res.data.user.name,
 bio: res.data.user.bio,
 avatar: res.data.user.avatar,
 location: res.data.user.location,
 }));
 setEditing(false);
 }
 } catch {
 alert('Failed to update profile.');
 } finally {
 setSaveLoading(false);
 }
 };

 // Handle Submit Feedback / Review
 const handleSubmitReview = async (e) => {
 e.preventDefault();
 if (!currentUser) {
 openAuthModal('login');
 return;
 }
 if (!reviewComment.trim()) {
 alert('Please write feedback comments.');
 return;
 }

 setReviewSubmitting(true);
 try {
 const res = await API.post(`/users/${targetUserId}/reviews`, {
 ratingType: reviewType,
 stars: reviewStars,
 itemAccuracy: reviewAccuracy,
 communication: reviewCommunication,
 punctuality: reviewPunctuality,
 comment: reviewComment.trim(),
 });

 if (res.data?.success) {
 setReviews((prev) => [res.data.review, ...prev]);
 setReviewModalOpen(false);
 setReviewComment('');
 // Refresh profile to reflect new score
 const profRes = await API.get(`/users/${targetUserId}/profile`);
 if (profRes.data?.success) {
 setReputation(profRes.data.reputation);
 }
 }
 } catch (err) {
 alert(err.response?.data?.message || 'Failed to submit feedback.');
 } finally {
 setReviewSubmitting(false);
 }
 };

 // Contact Seller from Public Profile
 const handleContactSeller = async () => {
 if (!currentUser) {
 openAuthModal('login');
 return;
 }
 if (listings.length === 0) {
 alert('This seller currently has no active listings to message about.');
 return;
 }
 try {
 const firstListing = listings[0];
 const res = await API.post('/chat/conversations', { listingId: firstListing._id });
 if (res.data?.success && res.data.conversation?._id) {
 navigate(`/messages?conversationId=${res.data.conversation._id}`);
 }
 } catch (err) {
 alert(err.response?.data?.message || 'Failed to start conversation.');
 }
 };

 // Toggle Listing Status (Own Profile)
 const promptToggleStatus = (listingId, newStatus, mode) => {
 const isDeactivating = newStatus === 'sold' || newStatus === 'completed';
 setConfirmModalConfig({
 isOpen: true,
 title: isDeactivating
 ? `Mark as ${mode === 'service' ? 'Completed' : 'Sold'}?`
 : 'Reactivate Listing?',
 message: isDeactivating
 ? 'This listing will be marked as finished and will no longer appear in the active marketplace feed.'
 : 'This listing will be placed back onto the active public feed so buyers nearby can discover it.',
 confirmText: isDeactivating ? `Mark as ${mode === 'service' ? 'Completed' : 'Sold'}` : 'Reactivate',
 variant: 'primary',
 onConfirm: async () => {
 try {
 const res = await API.patch(`/listings/${listingId}/status`, { status: newStatus });
 if (res.data?.success) {
 setListings((prev) =>
 prev.map((item) => (item._id === listingId ? { ...item, status: newStatus } : item))
 );
 }
 } catch {
 alert('Failed to update listing status');
 } finally {
 setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
 }
 },
 });
 };

 // Delete Listing (Own Profile)
 const promptDeleteListing = (listingId) => {
 setConfirmModalConfig({
 isOpen: true,
 title: 'Delete this listing?',
 message: 'Are you sure you want to delete this listing? It will be permanently removed from your profile and the marketplace.',
 confirmText: 'Delete Permanently',
 variant: 'danger',
 onConfirm: async () => {
 try {
 const res = await API.delete(`/listings/${listingId}`);
 if (res.data?.success) {
 setListings((prev) => prev.filter((item) => item._id !== listingId));
 }
 } catch {
 alert('Failed to delete listing');
 } finally {
 setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
 }
 },
 });
 };

 const activeListings = listings.filter((l) => l.status === 'active');
 const pastListings = listings.filter((l) => l.status === 'sold' || l.status === 'completed');

 const scorecard = reputation?.scorecardMatrix || {
 oneMonth: { positive: 0, neutral: 0, negative: 0 },
 sixMonths: { positive: 0, neutral: 0, negative: 0 },
 twelveMonths: { positive: 0, neutral: 0, negative: 0 },
 };

 const dsr = reputation?.detailedRatings || {
 itemAccuracy: 5.0,
 communication: 5.0,
 punctuality: 5.0,
 };

 const memberSinceFormatted = profileData?.createdAt
 ? new Date(profileData.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })
 : 'Recent';

 return (
 <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
 <div className="max-w-5xl mx-auto space-y-6">
 {/* Profile Header Card */}
 <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden ">
 {/* Header Accent Banner */}
 <div className="h-28 sm:h-36 bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 relative">
 <div className="absolute top-3.5 right-4 flex items-center gap-2">
 <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold border border-white/30">
 <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
 <span>Verified Local Member</span>
 </span>
 </div>
 </div>

 <div className="px-5 sm:px-8 pb-6 sm:pb-8 pt-0 relative z-10 space-y-5">
 {/* Avatar & Top Desktop Action Row */}
 <div className="flex items-end justify-between -mt-10 sm:-mt-12">
 {/* Avatar Container with optional Edit Camera Badge */}
 <div className="relative group">
 <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-indigo-600 text-white font-black text-3xl sm:text-4xl flex items-center justify-center border-4 border-white shrink-0 overflow-hidden bg-slate-100">
 {avatarUploading ? (
 <Loader2 className="w-7 h-7 text-white animate-spin" />
 ) : (avatarUrl || profileData?.avatar) ? (
 <img
 src={avatarUrl || profileData?.avatar}
 alt={profileData?.name || 'User'}
 className="w-full h-full object-cover"
 />
 ) : (
 profileData?.name?.charAt(0).toUpperCase() || 'U'
 )}
 </div>
 {isOwnProfile && editing && (
 <button
 type="button"
 onClick={() => avatarInputRef.current?.click()}
 disabled={avatarUploading}
 title="Change Profile Picture"
 className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full border-2 border-white shadow-none transition cursor-pointer"
 >
 <Camera className="w-3.5 h-3.5" />
 </button>
 )}
 </div>

 {/* Desktop / Tablet Actions */}
 <div className="hidden sm:flex items-center gap-2">
 {isOwnProfile ? (
 <button
 onClick={toggleEditing}
 className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
 >
 <Edit3 className="w-3.5 h-3.5" />
 <span>{editing ? 'Cancel Editing' : 'Edit Profile'}</span>
 </button>
 ) : (
 <div className="flex items-center gap-2">
 <button
 onClick={handleContactSeller}
 className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
 >
 <MessageSquare className="w-3.5 h-3.5" />
 <span>Contact Seller</span>
 </button>
 <button
 onClick={() => setReviewModalOpen(true)}
 className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
 >
 <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
 <span>Leave Feedback</span>
 </button>
 </div>
 )}
 </div>
 </div>

 {/* User Identity & Feedback Details (100% on Clean White Background) */}
 <div className="space-y-1.5 pt-1">
 <div className="flex items-center gap-2 flex-wrap">
 <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
 {profileData?.name || 'Local Member'}
 </h1>
 <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" title="Verified Member" />
 <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
 {reputation?.positivePercentage ?? 100}% Positive Feedback
 </span>
 </div>

 <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
 <span className="flex items-center gap-1 font-medium">
 <MapPin className="w-3.5 h-3.5 text-indigo-500" />
 {profileData?.location?.city || 'Nigeria'}
 </span>
 <span className="flex items-center gap-1 font-medium">
 <Calendar className="w-3.5 h-3.5 text-slate-400" />
 Member since {memberSinceFormatted}
 </span>
 {isOwnProfile && profileData?.email && (
 <span className="flex items-center gap-1 text-slate-400 font-medium">
 <Mail className="w-3.5 h-3.5" />
 {profileData.email}
 </span>
 )}
 </div>

 {profileData?.bio && !editing && (
 <p className="text-xs text-slate-600 pt-1.5 leading-relaxed max-w-2xl">
 "{profileData.bio}"
 </p>
 )}
 </div>

 {/* Mobile Action Buttons (Full-Width on Small Screens) */}
 <div className="sm:hidden pt-1">
 {isOwnProfile ? (
 <button
 onClick={toggleEditing}
 className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
 >
 <Edit3 className="w-3.5 h-3.5" />
 <span>{editing ? 'Cancel Editing' : 'Edit Profile'}</span>
 </button>
 ) : (
 <div className="flex items-center gap-2 w-full">
 <button
 onClick={handleContactSeller}
 className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
 >
 <MessageSquare className="w-3.5 h-3.5" />
 <span>Contact Seller</span>
 </button>
 <button
 onClick={() => setReviewModalOpen(true)}
 className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
 >
 <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
 <span>Leave Feedback</span>
 </button>
 </div>
 )}
 </div>

 {/* Quick Stats Strip */}
 <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
 <div>
 <span className="text-base sm:text-lg font-black text-slate-900">{activeListings.length}</span>
 <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active</span>
 </div>
 <div className="border-l border-slate-200">
 <span className="text-base sm:text-lg font-black text-slate-900">{pastListings.length}</span>
 <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
 </div>
 <div className="border-l border-slate-200">
 <span className="text-base sm:text-lg font-black text-emerald-700">{reputation?.totalReviews ?? reviews.length}</span>
 <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reviews</span>
 </div>
 <div className="border-l border-slate-200">
 <span className="text-base sm:text-lg font-black text-indigo-600">0%</span>
 <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fees</span>
 </div>
 </div>

 {/* Edit Profile Form */}
 {editing && isOwnProfile && (
 <form onSubmit={handleSaveProfile} className="pt-4 border-t border-slate-100 space-y-4">
 {/* Hidden File Input for Avatar */}
 <input
 type="file"
 ref={avatarInputRef}
 accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
 onChange={handleAvatarChange}
 className="hidden"
 />

 {/* Profile Picture Uploader Card */}
 <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
 <div className="relative w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center overflow-hidden border-2 border-white shrink-0">
 {avatarUploading ? (
 <Loader2 className="w-6 h-6 animate-spin text-white" />
 ) : avatarUrl ? (
 <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
 ) : (
 name?.charAt(0).toUpperCase() || 'U'
 )}
 </div>
 <div className="space-y-1 text-center sm:text-left flex-1">
 <div className="text-xs font-bold text-slate-800">Profile Picture</div>
 <p className="text-[11px] text-slate-500">
 Upload a clear square photo. WebP, JPG, or PNG up to 10MB.
 </p>
 <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
 <button
 type="button"
 onClick={() => avatarInputRef.current?.click()}
 disabled={avatarUploading}
 className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition cursor-pointer"
 >
 <Camera className="w-3.5 h-3.5 text-indigo-600" />
 <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
 </button>
 {avatarUrl && (
 <button
 type="button"
 onClick={() => setAvatarUrl('')}
 className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition font-medium cursor-pointer"
 >
 Remove
 </button>
 )}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 required
 className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">City / Region</label>
 <input
 type="text"
 value={city}
 onChange={(e) => setCity(e.target.value)}
 required
 className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
 />
 </div>
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">Short Bio</label>
 <textarea
 rows={2}
 value={bio}
 onChange={(e) => setBio(e.target.value)}
 placeholder="Introduce yourself to neighbors and buyers..."
 className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
 />
 </div>
 <div className="flex items-center gap-2">
 <button
 type="submit"
 disabled={saveLoading || avatarUploading}
 className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
 >
 {saveLoading ? 'Saving...' : 'Save Changes'}
 </button>
 <button
 type="button"
 onClick={toggleEditing}
 className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
 >
 Cancel
 </button>
 </div>
 </form>
 )}

 {profileData?.bio && !editing && (
 <div className="pt-3 border-t border-slate-100 text-xs text-slate-600">
 <p className="italic">"{profileData.bio}"</p>
 </div>
 )}
 </div>
 </div>

 {/* eBay-Style 12-Month Reputation Scorecard & Detailed Seller Ratings (DSR) */}
 <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
 <div>
 <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
 <Award className="w-5 h-5 text-indigo-600" />
 <span>Seller Reputation & 12-Month Scorecard</span>
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Verified peer-to-peer feedback matrix tracking item accuracy, speed, and safety.
 </p>
 </div>

 <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
 <span>Overall Positive:</span>
 <span className="text-emerald-700 font-black">{reputation?.positivePercentage ?? 100}%</span>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {/* 12-Month Matrix Table (7 cols) */}
 <div className="lg:col-span-7 overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead>
 <tr className="border-b border-slate-200 text-slate-500 font-bold">
 <th className="pb-2.5 font-bold">Feedback Rating</th>
 <th className="pb-2.5 text-center">Past Month</th>
 <th className="pb-2.5 text-center">Past 6 Months</th>
 <th className="pb-2.5 text-center">Past 12 Months</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 font-semibold">
 <tr>
 <td className="py-2.5 flex items-center gap-2 text-emerald-700">
 <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
 <ThumbsUp className="w-3 h-3 text-emerald-700" />
 </div>
 <span>Positive</span>
 </td>
 <td className="py-2.5 text-center text-emerald-700 font-bold">{scorecard.oneMonth.positive}</td>
 <td className="py-2.5 text-center text-emerald-700 font-bold">{scorecard.sixMonths.positive}</td>
 <td className="py-2.5 text-center text-emerald-700 font-bold">{scorecard.twelveMonths.positive}</td>
 </tr>

 <tr>
 <td className="py-2.5 flex items-center gap-2 text-slate-600">
 <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
 <Minus className="w-3 h-3 text-slate-600" />
 </div>
 <span>Neutral</span>
 </td>
 <td className="py-2.5 text-center text-slate-600">{scorecard.oneMonth.neutral}</td>
 <td className="py-2.5 text-center text-slate-600">{scorecard.sixMonths.neutral}</td>
 <td className="py-2.5 text-center text-slate-600">{scorecard.twelveMonths.neutral}</td>
 </tr>

 <tr>
 <td className="py-2.5 flex items-center gap-2 text-rose-600">
 <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
 <ThumbsDown className="w-3 h-3 text-rose-600" />
 </div>
 <span>Negative</span>
 </td>
 <td className="py-2.5 text-center text-rose-600">{scorecard.oneMonth.negative}</td>
 <td className="py-2.5 text-center text-rose-600">{scorecard.sixMonths.negative}</td>
 <td className="py-2.5 text-center text-rose-600">{scorecard.twelveMonths.negative}</td>
 </tr>
 </tbody>
 </table>
 </div>

 {/* Detailed Seller Ratings (DSR - 5 cols) */}
 <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3.5">
 <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
 Detailed Seller Ratings
 </h3>

 <div className="space-y-3 text-xs">
 <div>
 <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
 <span>Item as Described</span>
 <span className="font-bold text-slate-900">{dsr.itemAccuracy.toFixed(1)} / 5.0</span>
 </div>
 <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
 <div
 className="bg-amber-500 h-full rounded-full transition-all"
 style={{ width: `${(dsr.itemAccuracy / 5.0) * 100}%` }}
 />
 </div>
 </div>

 <div>
 <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
 <span>Communication & Promptness</span>
 <span className="font-bold text-slate-900">{dsr.communication.toFixed(1)} / 5.0</span>
 </div>
 <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
 <div
 className="bg-amber-500 h-full rounded-full transition-all"
 style={{ width: `${(dsr.communication / 5.0) * 100}%` }}
 />
 </div>
 </div>

 <div>
 <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
 <span>Safe Meetup & Punctuality</span>
 <span className="font-bold text-slate-900">{dsr.punctuality.toFixed(1)} / 5.0</span>
 </div>
 <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
 <div
 className="bg-amber-500 h-full rounded-full transition-all"
 style={{ width: `${(dsr.punctuality / 5.0) * 100}%` }}
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Multi-Perspective Navigation Tabs */}
 <div>
 <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
 <button
 onClick={() => setTab('active')}
 className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
 tab === 'active'
 ? 'bg-slate-900 text-white '
 : 'bg-white text-slate-600 hover:bg-slate-100'
 }`}
 >
 <Package className="w-3.5 h-3.5" />
 <span>Active Listings ({activeListings.length})</span>
 </button>

 {isOwnProfile && (
 <button
 onClick={() => setTab('sold')}
 className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
 tab === 'sold'
 ? 'bg-slate-900 text-white '
 : 'bg-white text-slate-600 hover:bg-slate-100'
 }`}
 >
 <CheckCircle className="w-3.5 h-3.5" />
 <span>Sold / Completed ({pastListings.length})</span>
 </button>
 )}

 {isOwnProfile && (
 <button
 onClick={() => setTab('favorites')}
 className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
 tab === 'favorites'
 ? 'bg-slate-900 text-white '
 : 'bg-white text-slate-600 hover:bg-slate-100'
 }`}
 >
 <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
 <span>Saved Watchlist ({favorites.length})</span>
 </button>
 )}

 <button
 onClick={() => setTab('reviews')}
 className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
 tab === 'reviews'
 ? 'bg-slate-900 text-white '
 : 'bg-white text-slate-600 hover:bg-slate-100'
 }`}
 >
 <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
 <span>Feedback & Reviews ({reviews.length})</span>
 </button>
 </div>

 {/* Tab Content Display */}
 <div className="mt-6">
 {loading ? (
 <div className="text-center py-12 text-xs text-slate-400">Loading marketplace records...</div>
 ) : tab === 'active' || tab === 'sold' ? (
 (tab === 'active' ? activeListings : pastListings).length === 0 ? (
 <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-4 max-w-md mx-auto my-6">
 <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
 <Package className="w-7 h-7" />
 </div>
 <div className="space-y-1">
 <p className="text-base font-bold text-slate-800">No {tab} listings</p>
 <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
 {tab === 'active'
 ? 'No active items or services available at this time.'
 : 'Completed transactions will appear here.'}
 </p>
 </div>
 {isOwnProfile && tab === 'active' && (
 <div className="pt-2">
 <Link
 to="/create"
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
 >
 <Plus className="w-4 h-4" />
 <span>Post a Listing</span>
 </Link>
 </div>
 )}
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
 {(tab === 'active' ? activeListings : pastListings).map((listing) => (
 <div key={listing._id} className="relative group">
 <ListingCard listing={listing} />
 {isOwnProfile && (
 <div className="mt-2 flex items-center justify-between gap-2 px-1">
 {tab === 'active' ? (
 <button
 onClick={() =>
 promptToggleStatus(
 listing._id,
 listing.mode === 'service' ? 'completed' : 'sold',
 listing.mode
 )
 }
 className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
 >
 Mark as {listing.mode === 'service' ? 'Completed' : 'Sold'}
 </button>
 ) : (
 <button
 onClick={() => promptToggleStatus(listing._id, 'active', listing.mode)}
 className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition"
 >
 Reactivate
 </button>
 )}

 <button
 onClick={() => promptDeleteListing(listing._id)}
 className="p-1 text-slate-400 hover:text-rose-600 transition"
 title="Delete listing"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 )}
 </div>
 ))}
 </div>
 )
 ) : tab === 'favorites' ? (
 favorites.length === 0 ? (
 <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-4 max-w-md mx-auto my-6">
 <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
 <Heart className="w-7 h-7" />
 </div>
 <div className="space-y-1">
 <p className="text-base font-bold text-slate-800">Your Watchlist is Empty</p>
 <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
 Tap the heart icon on any listing across the marketplace to save it to your watchlist.
 </p>
 </div>
 <div className="pt-2">
 <Link
 to="/market"
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
 >
 <span>Explore Market</span>
 </Link>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
 {favorites.map((listing) => (
 <ListingCard key={listing._id} listing={listing} />
 ))}
 </div>
 )
 ) : tab === 'reviews' ? (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-bold text-slate-900">
 Verified Customer Reviews ({reviews.length})
 </h3>
 {!isOwnProfile && (
 <button
 onClick={() => setReviewModalOpen(true)}
 className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5"
 >
 <Plus className="w-3.5 h-3.5" />
 <span>Write a Review</span>
 </button>
 )}
 </div>

 {reviews.length === 0 ? (
 <div className="text-center py-14 bg-white rounded-3xl border border-dashed border-slate-200 p-6 space-y-2">
 <Star className="w-8 h-8 text-slate-300 mx-auto" />
 <p className="text-xs font-bold text-slate-700">No reviews recorded yet</p>
 <p className="text-[11px] text-slate-400">
 When buyers complete in-person deals or handwork with this seller, their verified feedback will appear here.
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 {reviews.map((rev) => (
 <div
 key={rev._id}
 className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 "
 >
 <div className="flex items-start justify-between gap-3">
 <div className="flex items-center gap-2.5">
 <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-100 shrink-0">
 {rev.buyer?.name?.charAt(0).toUpperCase() || 'B'}
 </div>
 <div>
 <div className="flex items-center gap-1.5">
 <span className="text-xs font-bold text-slate-900">{rev.buyer?.name || 'Verified Buyer'}</span>
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
 Verified Deal
 </span>
 </div>
 <span className="text-[10px] text-slate-400">
 {new Date(rev.createdAt).toLocaleDateString([], {
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 })}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-1">
 {rev.ratingType === 'positive' ? (
 <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
 <ThumbsUp className="w-3 h-3" />
 <span>Positive</span>
 </span>
 ) : rev.ratingType === 'neutral' ? (
 <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
 <Minus className="w-3 h-3" />
 <span>Neutral</span>
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
 <ThumbsDown className="w-3 h-3" />
 <span>Negative</span>
 </span>
 )}
 </div>
 </div>

 <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>

 {/* Breakdown pills */}
 <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500 flex-wrap">
 <span>Accuracy: <strong>{rev.itemAccuracy || 5}★</strong></span>
 <span>•</span>
 <span>Communication: <strong>{rev.communication || 5}★</strong></span>
 <span>•</span>
 <span>Meetup: <strong>{rev.punctuality || 5}★</strong></span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 ) : null}
 </div>
 </div>
 </div>

 {/* Leave Feedback / Review Modal */}
 {reviewModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
 <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-100 relative">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <div className="flex items-center gap-2">
 <Award className="w-5 h-5 text-indigo-600" />
 <h3 className="text-base font-black text-slate-900">Leave Seller Feedback</h3>
 </div>
 <button
 onClick={() => setReviewModalOpen(false)}
 className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleSubmitReview} className="space-y-4">
 {/* Overall Sentiment Picker (eBay Style) */}
 <div>
 <label className="block text-xs font-bold text-slate-700 mb-2">Overall Experience</label>
 <div className="grid grid-cols-3 gap-2">
 <button
 type="button"
 onClick={() => {
 setReviewType('positive');
 setReviewStars(5);
 setReviewAccuracy(5);
 setReviewCommunication(5);
 setReviewPunctuality(5);
 }}
 className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
 reviewType === 'positive'
 ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-200'
 : 'border-slate-200 text-slate-600 hover:bg-slate-50'
 }`}
 >
 <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
 <span>Positive</span>
 </button>

 <button
 type="button"
 onClick={() => {
 setReviewType('neutral');
 setReviewStars(3);
 setReviewAccuracy(3);
 setReviewCommunication(3);
 setReviewPunctuality(3);
 }}
 className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
 reviewType === 'neutral'
 ? 'bg-slate-100 border-slate-300 text-slate-800 ring-2 ring-slate-200'
 : 'border-slate-200 text-slate-600 hover:bg-slate-50'
 }`}
 >
 <Minus className="w-3.5 h-3.5 text-slate-600" />
 <span>Neutral</span>
 </button>

 <button
 type="button"
 onClick={() => {
 setReviewType('negative');
 setReviewStars(1);
 setReviewAccuracy(1);
 setReviewCommunication(1);
 setReviewPunctuality(1);
 }}
 className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
 reviewType === 'negative'
 ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-200'
 : 'border-slate-200 text-slate-600 hover:bg-slate-50'
 }`}
 >
 <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
 <span>Negative</span>
 </button>
 </div>
 </div>

 {/* Overall Star Rating */}
 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 Overall Star Rating ({reviewStars} / 5)
 </label>
 <div className="flex items-center gap-1.5 py-1">
 {[1, 2, 3, 4, 5].map((s) => (
 <button
 key={s}
 type="button"
 onClick={() => {
 setReviewStars(s);
 if (s <= 2) setReviewType('negative');
 else if (s === 3) setReviewType('neutral');
 else setReviewType('positive');
 }}
 className="p-1 cursor-pointer transition hover:scale-110"
 >
 <Star
 className={`w-6 h-6 ${
 s <= reviewStars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
 }`}
 />
 </button>
 ))}
 </div>
 </div>

 {/* Detailed Star Ratings */}
 <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
 <div className="flex items-center justify-between">
 <span className="font-semibold text-slate-700">Item Accuracy:</span>
 <div className="flex items-center gap-1">
 {[1, 2, 3, 4, 5].map((s) => (
 <button
 key={s}
 type="button"
 onClick={() => {
 setReviewAccuracy(s);
 const avg = Math.max(1, Math.min(5, Math.round((s + reviewCommunication + reviewPunctuality) / 3)));
 setReviewStars(avg);
 if (avg <= 2) setReviewType('negative');
 else if (avg === 3) setReviewType('neutral');
 else setReviewType('positive');
 }}
 className="p-0.5 text-amber-500 cursor-pointer"
 >
 <Star className={`w-4 h-4 ${s <= reviewAccuracy ? 'fill-amber-500' : 'text-slate-300'}`} />
 </button>
 ))}
 </div>
 </div>

 <div className="flex items-center justify-between">
 <span className="font-semibold text-slate-700">Communication:</span>
 <div className="flex items-center gap-1">
 {[1, 2, 3, 4, 5].map((s) => (
 <button
 key={s}
 type="button"
 onClick={() => {
 setReviewCommunication(s);
 const avg = Math.max(1, Math.min(5, Math.round((reviewAccuracy + s + reviewPunctuality) / 3)));
 setReviewStars(avg);
 if (avg <= 2) setReviewType('negative');
 else if (avg === 3) setReviewType('neutral');
 else setReviewType('positive');
 }}
 className="p-0.5 text-amber-500 cursor-pointer"
 >
 <Star className={`w-4 h-4 ${s <= reviewCommunication ? 'fill-amber-500' : 'text-slate-300'}`} />
 </button>
 ))}
 </div>
 </div>

 <div className="flex items-center justify-between">
 <span className="font-semibold text-slate-700">Safe Meetup / Punctuality:</span>
 <div className="flex items-center gap-1">
 {[1, 2, 3, 4, 5].map((s) => (
 <button
 key={s}
 type="button"
 onClick={() => {
 setReviewPunctuality(s);
 const avg = Math.max(1, Math.min(5, Math.round((reviewAccuracy + reviewCommunication + s) / 3)));
 setReviewStars(avg);
 if (avg <= 2) setReviewType('negative');
 else if (avg === 3) setReviewType('neutral');
 else setReviewType('positive');
 }}
 className="p-0.5 text-amber-500 cursor-pointer"
 >
 <Star className={`w-4 h-4 ${s <= reviewPunctuality ? 'fill-amber-500' : 'text-slate-300'}`} />
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Feedback Comment */}
 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1">
 Feedback Comment
 </label>
 <textarea
 rows={3}
 value={reviewComment}
 onChange={(e) => setReviewComment(e.target.value)}
 placeholder="Share details on item condition, responsiveness, and meetup punctuality..."
 required
 className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-200"
 />
 </div>

 <div className="flex items-center justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setReviewModalOpen(false)}
 className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={reviewSubmitting || !reviewComment.trim()}
 className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer "
 >
 <Send className="w-3.5 h-3.5" />
 <span>{reviewSubmitting ? 'Posting...' : 'Submit Feedback'}</span>
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
 />
 </div>
 );
}
