import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API, { resolveMediaUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePermissions } from '../context/PermissionContext';
import { profileRouteCache } from '../utils/routeCache';
import ListingCard from '../components/ListingCard';
import ConfirmModal from '../components/ConfirmModal';
import PullToRefresh from '../components/PullToRefresh';
import ResponsiveSheet from '../components/ResponsiveSheet';
import {
 MapPin,
 Mail,
 Edit3,
 Package,
 CheckCircle,
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
 Image as ImageIcon,
 Loader2,
 LogOut,
 ChevronDown,
 SlidersHorizontal,
} from 'lucide-react';

export default function ProfilePage() {
 const { userId } = useParams();
 const { user: currentUser, updateUser, logout, openAuthModal } = useAuth();
 const { showToast } = useToast();
 const { openPermissionsCenter, states: permStates } = usePermissions();
 const hasBlockedPermission = Object.values(permStates || {}).includes('denied');
 const navigate = useNavigate();

 const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
 const targetUserId = userId || currentUserId;
 const isOwnProfile = !userId || (currentUserId && userId === currentUserId);
 const profileCacheKey = targetUserId ? `${targetUserId}:${isOwnProfile ? 'own' : 'pub'}` : null;
 const initialCached = profileRouteCache.get(profileCacheKey);

 const [profileData, setProfileData] = useState(
 () => initialCached?.profileData || (isOwnProfile ? currentUser : null)
 );
 const [reputation, setReputation] = useState(() => initialCached?.reputation || null);
 const [listings, setListings] = useState(() => initialCached?.listings || []);
 const [favorites, setFavorites] = useState(() => initialCached?.favorites || []);
 const [reviews, setReviews] = useState(() => initialCached?.reviews || []);
 const [loading, setLoading] = useState(() => !initialCached);

 // Tab State
 const [tab, setTab] = useState('active'); // 'active' | 'favorites' | 'sold' | 'reviews'

 // Edit Profile State
 const [editing, setEditing] = useState(false);
 const [name, setName] = useState(() => initialCached?.profileData?.name || (isOwnProfile ? currentUser?.name || '' : ''));
 const [bio, setBio] = useState(() => initialCached?.profileData?.bio || (isOwnProfile ? currentUser?.bio || '' : ''));
 const [city, setCity] = useState(() => initialCached?.profileData?.location?.city || (isOwnProfile ? currentUser?.location?.city || '' : ''));
 const [avatarUrl, setAvatarUrl] = useState(() => initialCached?.profileData?.avatar || (isOwnProfile ? currentUser?.avatar || '' : ''));
 const [coverUrl, setCoverUrl] = useState(() => initialCached?.profileData?.coverImage || (isOwnProfile ? currentUser?.coverImage || '' : ''));
 const [avatarUploading, setAvatarUploading] = useState(false);
 const [coverUploading, setCoverUploading] = useState(false);
 const [saveLoading, setSaveLoading] = useState(false);
 const [scorecardExpanded, setScorecardExpanded] = useState(false);
 const avatarInputRef = useRef(null);
 const coverInputRef = useRef(null);

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

 // Fetch Profile & Reputation Data in parallel with Stale-While-Revalidate cache
 useEffect(() => {
 if (!targetUserId) {
 if (!currentUserId) {
 openAuthModal('login');
 navigate('/');
 }
 return;
 }

 const cacheKey = `${targetUserId}:${isOwnProfile ? 'own' : 'pub'}`;
 const cached = profileRouteCache.get(cacheKey);
 if (cached) {
 setProfileData(cached.profileData);
 setReputation(cached.reputation);
 setListings(cached.listings || []);
 setFavorites(cached.favorites || []);
 setReviews(cached.reviews || []);
 setName(cached.profileData?.name || '');
 setBio(cached.profileData?.bio || '');
 setCity(cached.profileData?.location?.city || '');
 setAvatarUrl(cached.profileData?.avatar || '');
 setCoverUrl(cached.profileData?.coverImage || '');
 setLoading(false);
 } else {
 setLoading(true);
 }

 let cancelled = false;
 const loadProfile = async () => {
 try {
 const requests = [
 API.get(`/users/${targetUserId}/profile`),
 isOwnProfile
 ? API.get('/listings/user/my-listings')
 : API.get(`/users/${targetUserId}/listings`),
 API.get(`/users/${targetUserId}/reviews`),
 ];
 if (isOwnProfile) {
 requests.push(API.get('/listings/user/favorites'));
 }

 const [profRes, listRes, revRes, favRes] = await Promise.all(requests);
 if (cancelled) return;

 const nextProfile = profRes.data?.success ? profRes.data.user : cached?.profileData || null;
 const nextReputation = profRes.data?.success ? profRes.data.reputation : cached?.reputation || null;
 const nextListings = listRes.data?.success ? listRes.data.listings || [] : cached?.listings || [];
 const nextReviews = revRes.data?.success ? revRes.data.reviews || [] : cached?.reviews || [];
 const nextFavorites = favRes?.data?.success
 ? favRes.data.listings || favRes.data.favorites || []
 : cached?.favorites || [];

 if (profRes.data?.success) {
 setProfileData(nextProfile);
 setReputation(nextReputation);
 setName(nextProfile.name || '');
 setBio(nextProfile.bio || '');
 setCity(nextProfile.location?.city || '');
 setAvatarUrl(nextProfile.avatar || '');
 setCoverUrl(nextProfile.coverImage || '');
 }

 if (listRes.data?.success) {
 setListings(nextListings);
 }

 if (revRes.data?.success) {
 setReviews(nextReviews);
 }

 if (favRes?.data?.success) {
 setFavorites(nextFavorites);
 }

 profileRouteCache.set(cacheKey, {
 profileData: nextProfile,
 reputation: nextReputation,
 listings: nextListings,
 favorites: nextFavorites,
 reviews: nextReviews,
 });
 } catch (err) {
 console.error('Failed to load profile:', err);
 } finally {
 if (!cancelled) setLoading(false);
 }
 };

 loadProfile();
 return () => {
 cancelled = true;
 };
 }, [targetUserId, isOwnProfile, currentUserId, navigate, openAuthModal]);

 // Keep cached profile record synced after local mutations (avatar/cover/edit/listing updates)
 useEffect(() => {
 if (!profileCacheKey || !profileData) return;
 profileRouteCache.set(profileCacheKey, {
 profileData,
 reputation,
 listings,
 favorites,
 reviews,
 });
 }, [profileCacheKey, profileData, reputation, listings, favorites, reviews]);

 const showNotice = (text, type = 'success') => {
 showToast(text, type);
 };

 // Handle Avatar Image File Selection (uploads to persistent MongoDB storage & saves immediately)
 const handleAvatarChange = async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;

 if (file.size > 8 * 1024 * 1024) {
 showNotice('Profile picture must be under 8MB.', 'error');
 if (avatarInputRef.current) avatarInputRef.current.value = '';
 return;
 }

 setAvatarUploading(true);
 try {
 const formData = new FormData();
 formData.append('images', file);
 const res = await API.post('/upload?purpose=avatar', formData, {
 headers: { 'Content-Type': 'multipart/form-data' },
 });

 if (res.data?.success && res.data.images?.length > 0) {
 const uploadedUrl = res.data.images[0].url;
 const saveRes = await API.put('/auth/me', { avatar: uploadedUrl });
 if (saveRes.data?.success) {
 setAvatarUrl(uploadedUrl);
 updateUser(saveRes.data.user);
 setProfileData((prev) => (prev ? { ...prev, avatar: uploadedUrl } : prev));
 showNotice('Profile picture updated across all devices.');
 }
 } else {
 showNotice('Failed to upload image.', 'error');
 }
 } catch (err) {
 showNotice(err.response?.data?.message || 'Failed to upload profile picture.', 'error');
 } finally {
 setAvatarUploading(false);
 if (avatarInputRef.current) avatarInputRef.current.value = '';
 }
 };

 // Handle Cover / Background Image Selection (uploads to persistent MongoDB storage & saves immediately)
 const handleCoverChange = async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;

 if (file.size > 8 * 1024 * 1024) {
 showNotice('Cover background image must be under 8MB.', 'error');
 if (coverInputRef.current) coverInputRef.current.value = '';
 return;
 }

 setCoverUploading(true);
 try {
 const formData = new FormData();
 formData.append('images', file);
 const res = await API.post('/upload?purpose=cover', formData, {
 headers: { 'Content-Type': 'multipart/form-data' },
 });

 if (res.data?.success && res.data.images?.length > 0) {
 const uploadedUrl = res.data.images[0].url;
 const saveRes = await API.put('/auth/me', { coverImage: uploadedUrl });
 if (saveRes.data?.success) {
 setCoverUrl(uploadedUrl);
 updateUser(saveRes.data.user);
 setProfileData((prev) => (prev ? { ...prev, coverImage: uploadedUrl } : prev));
 showNotice('Profile cover background updated across all devices.');
 }
 } else {
 showNotice('Failed to upload cover background.', 'error');
 }
 } catch (err) {
 showNotice(err.response?.data?.message || 'Failed to upload cover background.', 'error');
 } finally {
 setCoverUploading(false);
 if (coverInputRef.current) coverInputRef.current.value = '';
 }
 };

 const handleRemoveCover = async () => {
 setCoverUploading(true);
 try {
 const saveRes = await API.put('/auth/me', { coverImage: '' });
 if (saveRes.data?.success) {
 setCoverUrl('');
 updateUser(saveRes.data.user);
 setProfileData((prev) => (prev ? { ...prev, coverImage: '' } : prev));
 showNotice('Cover background reset to default.');
 }
 } catch {
 showNotice('Failed to reset cover background.', 'error');
 } finally {
 setCoverUploading(false);
 }
 };

 // Toggle Edit Mode with Cancel Reset
 const toggleEditing = () => {
 if (editing) {
 setName(profileData?.name || '');
 setBio(profileData?.bio || '');
 setCity(profileData?.location?.city || '');
 setAvatarUrl(profileData?.avatar || '');
 setCoverUrl(profileData?.coverImage || '');
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
 coverImage: coverUrl,
 });
 if (res.data?.success) {
 updateUser(res.data.user);
 setProfileData((prev) => ({
 ...prev,
 name: res.data.user.name,
 bio: res.data.user.bio,
 avatar: res.data.user.avatar,
 coverImage: res.data.user.coverImage || '',
 location: res.data.user.location,
 }));
 setEditing(false);
 showNotice('Profile changes saved.');
 }
 } catch {
 showNotice('Failed to update profile.', 'error');
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
 showToast('Please write feedback comments.', 'error');
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
 setReviews((prev) => {
 const filtered = prev.filter((r) => r._id !== res.data.review._id);
 return [res.data.review, ...filtered];
 });
 setReviewModalOpen(false);
 setReviewComment('');
 showToast('Feedback submitted.', 'success');
 // Refresh profile to reflect updated score
 const profRes = await API.get(`/users/${targetUserId}/profile`);
 if (profRes.data?.success) {
 setReputation(profRes.data.reputation);
 setProfileData(profRes.data.user);
 }
 }
 } catch (err) {
 showToast(err.response?.data?.message || 'Failed to submit feedback.', 'error');
 } finally {
 setReviewSubmitting(false);
 }
 };

 // Contact Seller from Public Profile (strict self-messaging guard)
 const handleContactSeller = async () => {
 if (!currentUser) {
 openAuthModal('login');
 return;
 }
 if (isOwnProfile || (currentUserId && targetUserId && String(targetUserId) === String(currentUserId))) {
 showToast('You cannot message yourself.', 'info');
 return;
 }
 if (listings.length === 0) {
 showToast('This seller currently has no active listings to message about.', 'info');
 return;
 }
 const firstListing = listings.find((l) => {
 const ownerId = (l?.seller?._id || l?.seller?.id || l?.seller)?.toString();
 return !ownerId || ownerId !== currentUserId;
 });
 if (!firstListing) {
 showToast('You cannot message yourself on your own listing.', 'info');
 return;
 }
 try {
 const res = await API.post('/chat/conversations', { listingId: firstListing._id });
 if (res.data?.success && res.data.conversation?._id) {
 navigate(`/messages?conversationId=${res.data.conversation._id}`);
 }
 } catch (err) {
 showToast(err.response?.data?.message || 'Failed to start conversation.', 'error');
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
 showToast('Failed to update listing status.', 'error');
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
 showToast('Listing deleted.', 'info');
 }
 } catch {
 showToast('Failed to delete listing.', 'error');
 } finally {
 setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
 }
 },
 });
 };

 const activeListings = listings.filter((l) => l.status === 'active');
 const pastListings = listings.filter((l) => l.status === 'sold' || l.status === 'completed');
 const completedDealsCount = isOwnProfile
 ? pastListings.length
 : profileData?.itemsSoldCount ?? reputation?.itemsSoldCount ?? pastListings.length;

 const scorecard = reputation?.scorecardMatrix || {
 oneMonth: { positive: 0, neutral: 0, negative: 0 },
 sixMonths: { positive: 0, neutral: 0, negative: 0 },
 twelveMonths: { positive: 0, neutral: 0, negative: 0 },
 };

 const hasReviews = Boolean(reputation?.hasReviews && (reputation?.totalReviews || 0) > 0);
 const dsr = reputation?.detailedRatings || {
 itemAccuracy: 0,
 communication: 0,
 punctuality: 0,
 };

 const promptLogout = () => {
 setConfirmModalConfig({
 isOpen: true,
 title: 'Log Out of oBuy?',
 message: 'Are you sure you want to end your current session? You will need your password to sign back in.',
 confirmText: 'Log Out',
 variant: 'danger',
 onConfirm: async () => {
 await logout();
 setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
 navigate('/');
 },
 });
 };

 const resolvedProfileAvatar = resolveMediaUrl(avatarUrl || profileData?.avatar || '');
 const resolvedCoverImage = resolveMediaUrl(coverUrl || profileData?.coverImage || '');

 const memberSinceFormatted = profileData?.createdAt
 ? new Date(profileData.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })
 : 'Recent';

 const showScorecardBody = hasReviews || scorecardExpanded;

 const handlePullRefresh = async () => {
 if (!targetUserId) return;
 try {
 const requests = [
 API.get(`/users/${targetUserId}/profile`),
 isOwnProfile ? API.get('/listings/user/my-listings') : API.get(`/users/${targetUserId}/listings`),
 API.get(`/users/${targetUserId}/reviews`),
 ];
 if (isOwnProfile) requests.push(API.get('/listings/user/favorites'));
 const [profRes, listRes, revRes, favRes] = await Promise.all(requests);
 if (profRes.data?.success) {
 setProfileData(profRes.data.user);
 setReputation(profRes.data.reputation);
 }
 if (listRes.data?.success) setListings(listRes.data.listings || []);
 if (revRes.data?.success) setReviews(revRes.data.reviews || []);
 if (favRes?.data?.success) setFavorites(favRes.data.listings || favRes.data.favorites || []);
 } catch {
 // Ignore transient refresh failure
 }
 };

 return (
 <PullToRefresh onRefresh={handlePullRefresh}>
 <div className="min-h-screen bg-slate-50">
 {/* Always-mounted file inputs for direct one-tap Avatar & Cover Background changes */}
 {isOwnProfile && (
 <>
 <input
 type="file"
 ref={avatarInputRef}
 accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
 onChange={handleAvatarChange}
 className="hidden"
 />
 <input
 type="file"
 ref={coverInputRef}
 accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
 onChange={handleCoverChange}
 className="hidden"
 />
 </>
 )}

 <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
 {/* Full-Bleed Profile Header across all breakpoints */}
 <section className="bg-white border-b border-slate-200 sm:border-x overflow-hidden">
 {/* Changeable Header Cover Banner */}
 <div className="h-32 sm:h-40 bg-gradient-to-r from-brand-700 via-brand-800 to-purple-800 relative overflow-hidden">
 {resolvedCoverImage && (
 <>
 <img
 src={resolvedCoverImage}
 alt="Profile cover background"
 className="w-full h-full object-cover"
 decoding="async"
 />
 <div className="absolute inset-0 bg-slate-900/20 pointer-events-none" />
 </>
 )}

 {profileData?.isVerified && (
 <div className="absolute top-3 right-3 sm:right-4 flex items-center gap-2 z-10">
 <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/65 text-white text-[11px] font-bold border border-white/25">
 <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
 <span>Verified oBuy Member</span>
 </span>
 </div>
 )}
 </div>

 <div className="px-4 sm:px-6 pb-5 pt-0 relative z-10 space-y-4">
 {/* Avatar & Top Desktop Action Row */}
 <div className="flex items-end justify-between -mt-10 sm:-mt-12">
 <div className="relative group">
 <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-brand-600 text-white font-black text-3xl sm:text-4xl flex items-center justify-center border-4 border-white shrink-0 overflow-hidden">
 {avatarUploading ? (
 <Loader2 className="w-7 h-7 text-white animate-spin" />
 ) : resolvedProfileAvatar ? (
 <img
 src={resolvedProfileAvatar}
 alt={profileData?.name || 'User'}
 className="w-full h-full object-cover"
 decoding="async"
 />
 ) : (
 profileData?.name?.charAt(0).toUpperCase() || 'U'
 )}
 </div>
 </div>

 {/* Desktop / Tablet Actions */}
 <div className="hidden sm:flex items-center gap-2">
 {isOwnProfile ? (
 <>
 <button
 type="button"
 onClick={toggleEditing}
 className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <Edit3 className="w-3.5 h-3.5" />
 <span>Edit Profile</span>
 </button>
 <button
 type="button"
 onClick={openPermissionsCenter}
 className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <SlidersHorizontal className="w-3.5 h-3.5 text-brand-600" />
 <span>Permissions</span>
 {hasBlockedPermission && <span className="w-2 h-2 rounded-full bg-rose-500" />}
 </button>
 <button
 type="button"
 onClick={promptLogout}
 className="px-3.5 py-2 text-xs font-bold rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <LogOut className="w-3.5 h-3.5" />
 <span>Log Out</span>
 </button>
 </>
 ) : (
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={handleContactSeller}
 className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <MessageSquare className="w-3.5 h-3.5" />
 <span>Contact Seller</span>
 </button>
 <button
 type="button"
 onClick={() => setReviewModalOpen(true)}
 className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
 <span>Leave Feedback</span>
 </button>
 </div>
 )}
 </div>
 </div>

 {/* User Identity & Feedback Details */}
 <div className="space-y-1.5">
 <div className="flex items-center gap-2 flex-wrap">
 <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
 {profileData?.name || 'oBuy Member'}
 </h1>
 {profileData?.isVerified && (
 <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" title="Verified Member" />
 )}
 {hasReviews ? (
 <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
 {reputation.positivePercentage}% Positive ({reputation.averageRating?.toFixed(1)}★)
 </span>
 ) : (
 <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
 New Member • No reviews yet
 </span>
 )}
 </div>

 <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
 <span className="flex items-center gap-1 font-medium">
 <MapPin className="w-3.5 h-3.5 text-brand-500" />
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

 {profileData?.bio && (
 <p className="text-xs text-slate-600 pt-1 leading-relaxed max-w-2xl">
 "{profileData.bio}"
 </p>
 )}
 </div>

 {/* Mobile Action Buttons (includes Log Out directly on Profile for mobile users) */}
 <div className="sm:hidden">
 {isOwnProfile ? (
 <div className="grid grid-cols-3 gap-2">
 <button
 type="button"
 onClick={toggleEditing}
 className="px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <Edit3 className="w-3.5 h-3.5 shrink-0" />
 <span className="truncate">Edit</span>
 </button>
 <button
 type="button"
 onClick={openPermissionsCenter}
 className="px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <SlidersHorizontal className="w-3.5 h-3.5 text-brand-600 shrink-0" />
 <span className="truncate">Permissions</span>
 {hasBlockedPermission && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
 </button>
 <button
 type="button"
 onClick={promptLogout}
 className="px-3 py-2.5 text-xs font-bold rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <LogOut className="w-3.5 h-3.5 shrink-0" />
 <span className="truncate">Log Out</span>
 </button>
 </div>
 ) : (
 <div className="flex items-center gap-2 w-full">
 <button
 type="button"
 onClick={handleContactSeller}
 className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <MessageSquare className="w-3.5 h-3.5" />
 <span>Contact Seller</span>
 </button>
 <button
 type="button"
 onClick={() => setReviewModalOpen(true)}
 className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
 <span>Leave Feedback</span>
 </button>
 </div>
 )}
 </div>
 </div>

 {/* Flat Edge-to-Edge Quick Stats Strip (zero nested box margins) */}
 <div className="grid grid-cols-4 border-t border-slate-100 py-3.5 text-center bg-slate-50/50">
 <div>
 <span className="text-base sm:text-lg font-black text-slate-900">
 {profileData?.activeListingsCount ?? activeListings.length}
 </span>
 <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active</span>
 </div>
 <div className="border-l border-slate-200/80">
 <span className="text-base sm:text-lg font-black text-slate-900">{completedDealsCount}</span>
 <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sold</span>
 </div>
 <div className="border-l border-slate-200/80">
 <span className="text-base sm:text-lg font-black text-emerald-700">
 {reputation?.totalReviews ?? reviews.length}
 </span>
 <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reviews</span>
 </div>
 <div className="border-l border-slate-200/80">
 <span className="text-base sm:text-lg font-black text-amber-600">
 {hasReviews && reputation?.averageRating ? `${reputation.averageRating.toFixed(1)}★` : 'New'}
 </span>
 <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rating</span>
 </div>
 </div>
 </section>

 {/* Flat Seller Reputation & 12-Month Scorecard Section across all breakpoints */}
 <section className="bg-white border-y border-slate-200 sm:border-x mt-2 px-4 sm:px-6 py-4 sm:py-5">
 <div className="flex items-center justify-between gap-2">
 <div className="min-w-0">
 <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
 <Award className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600 shrink-0" />
 <span className="truncate">Seller Reputation & Scorecard</span>
 </h2>
 {!showScorecardBody && (
 <p className="text-[11px] text-slate-500 mt-0.5">
 Overall Positive: <strong className="text-slate-700">No reviews yet</strong>
 </p>
 )}
 </div>

 <div className="flex items-center gap-2 shrink-0">
 {showScorecardBody && (
 <div className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
 <span>Overall Positive:</span>
 <span className={hasReviews ? 'text-emerald-700 font-black' : 'text-slate-500 font-bold'}>
 {hasReviews ? `${reputation.positivePercentage}%` : 'No reviews yet'}
 </span>
 </div>
 )}
 {!hasReviews && (
 <button
 type="button"
 onClick={() => setScorecardExpanded((prev) => !prev)}
 className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
 aria-expanded={showScorecardBody}
 >
 <span>{showScorecardBody ? 'Hide' : 'Details'}</span>
 <ChevronDown
 className={`w-3.5 h-3.5 transition-transform ${showScorecardBody ? 'rotate-180' : ''}`}
 />
 </button>
 )}
 </div>
 </div>

 {showScorecardBody && (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 mt-4 border-t border-slate-100">
 {/* 12-Month Matrix Table (7 cols) */}
 <div className="lg:col-span-7 overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead>
 <tr className="border-b border-slate-200 text-slate-500 font-bold">
 <th className="pb-2 font-bold">Feedback</th>
 <th className="pb-2 text-center">1 Mo</th>
 <th className="pb-2 text-center">6 Mo</th>
 <th className="pb-2 text-center">12 Mo</th>
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

 {/* Detailed Seller Ratings (flat divided column, zero inner card box) */}
 <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 space-y-3">
 <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
 Detailed Seller Ratings
 </h3>

 <div className="space-y-2.5 text-xs">
 <div>
 <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
 <span>Item as Described</span>
 <span className="font-bold text-slate-900">
 {hasReviews ? `${dsr.itemAccuracy.toFixed(1)} / 5.0` : 'No ratings'}
 </span>
 </div>
 <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
 <div
 className="bg-amber-500 h-full rounded-full transition-all"
 style={{ width: `${hasReviews ? (dsr.itemAccuracy / 5.0) * 100 : 0}%` }}
 />
 </div>
 </div>

 <div>
 <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
 <span>Communication & Promptness</span>
 <span className="font-bold text-slate-900">
 {hasReviews ? `${dsr.communication.toFixed(1)} / 5.0` : 'No ratings'}
 </span>
 </div>
 <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
 <div
 className="bg-amber-500 h-full rounded-full transition-all"
 style={{ width: `${hasReviews ? (dsr.communication / 5.0) * 100 : 0}%` }}
 />
 </div>
 </div>

 <div>
 <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
 <span>Safe Meetup & Punctuality</span>
 <span className="font-bold text-slate-900">
 {hasReviews ? `${dsr.punctuality.toFixed(1)} / 5.0` : 'No ratings'}
 </span>
 </div>
 <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
 <div
 className="bg-amber-500 h-full rounded-full transition-all"
 style={{ width: `${hasReviews ? (dsr.punctuality / 5.0) * 100 : 0}%` }}
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </section>

 {/* Multi-Perspective Navigation Tabs (Active -> Saved Watchlist -> Sold -> Reviews) */}
 <div className="px-4 sm:px-0 pt-4 pb-8">
 <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
 <button
 type="button"
 onClick={() => setTab('active')}
 className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
 tab === 'active'
 ? 'bg-slate-900 text-white'
 : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
 }`}
 >
 <Package className="w-3.5 h-3.5" />
 <span>Active Listings ({activeListings.length})</span>
 </button>

 {isOwnProfile && (
 <button
 type="button"
 onClick={() => setTab('favorites')}
 className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
 tab === 'favorites'
 ? 'bg-slate-900 text-white'
 : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
 }`}
 >
 <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
 <span>Saved Watchlist ({favorites.length})</span>
 </button>
 )}

 {isOwnProfile && (
 <button
 type="button"
 onClick={() => setTab('sold')}
 className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
 tab === 'sold'
 ? 'bg-slate-900 text-white'
 : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
 }`}
 >
 <CheckCircle className="w-3.5 h-3.5" />
 <span>Sold / Completed ({pastListings.length})</span>
 </button>
 )}

 <button
 type="button"
 onClick={() => setTab('reviews')}
 className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
 tab === 'reviews'
 ? 'bg-slate-900 text-white'
 : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
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
 <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto">
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
 <ListingCard
 key={listing._id}
 listing={listing}
 ownerActions={
 isOwnProfile
 ? {
 isActive: tab === 'active',
 onEdit: () => navigate(`/edit/${listing._id}`),
 onToggleStatus: () =>
 tab === 'active'
 ? promptToggleStatus(
 listing._id,
 listing.mode === 'service' ? 'completed' : 'sold',
 listing.mode
 )
 : promptToggleStatus(listing._id, 'active', listing.mode),
 onDelete: () => promptDeleteListing(listing._id),
 }
 : null
 }
 />
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
 <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-100 shrink-0 overflow-hidden">
 {rev.buyer?.avatar ? (
 <img src={resolveMediaUrl(rev.buyer.avatar)} alt={rev.buyer?.name} className="w-full h-full object-cover" decoding="async" />
 ) : (
 rev.buyer?.name?.charAt(0).toUpperCase() || 'B'
 )}
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
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55">
 <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 relative">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <div className="flex items-center gap-2">
 <Award className="w-5 h-5 text-brand-600" />
 <h3 className="text-base font-black text-slate-900">Leave Seller Feedback</h3>
 </div>
 <button
 type="button"
 onClick={() => setReviewModalOpen(false)}
 className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleSubmitReview} className="space-y-4">
 {/* Overall Sentiment Picker */}
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
 className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-200"
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
 className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer "
 >
 <Send className="w-3.5 h-3.5" />
 <span>{reviewSubmitting ? 'Posting...' : 'Submit Feedback'}</span>
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Edit Profile Draggable Bottom Sheet / Modal */}
 <ResponsiveSheet
 open={Boolean(editing && isOwnProfile)}
 onClose={toggleEditing}
 title="Edit Profile"
 maxWidth="max-w-lg"
 showDefaultHeader={false}
 headerSlot={
 <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-3.5">
 <div className="flex items-center gap-2">
 <Edit3 className="w-4 h-4 text-brand-600" />
 <h3 className="text-base font-black text-slate-900">Edit Profile</h3>
 </div>
 <button
 type="button"
 onClick={toggleEditing}
 className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
 aria-label="Close edit profile"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 }
 bodyClassName="p-5 sm:p-6 space-y-5"
 >

 <form onSubmit={handleSaveProfile} className="space-y-4">
 {/* Avatar & Cover Quick Controls */}
 <div className="divide-y divide-slate-100 border-y border-slate-100">
 <div className="flex items-center justify-between gap-3 py-3">
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-11 h-11 rounded-xl bg-brand-600 text-white font-black text-base flex items-center justify-center overflow-hidden shrink-0">
 {avatarUploading ? (
 <Loader2 className="w-4 h-4 animate-spin text-white" />
 ) : avatarUrl ? (
 <img src={resolveMediaUrl(avatarUrl)} alt="Avatar preview" className="w-full h-full object-cover" />
 ) : (
 name?.charAt(0).toUpperCase() || 'U'
 )}
 </div>
 <div className="min-w-0">
 <div className="text-xs font-bold text-slate-800">Profile Picture</div>
 <div className="text-[11px] text-slate-500">JPG, PNG, or WebP up to 8MB</div>
 </div>
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <button
 type="button"
 onClick={() => avatarInputRef.current?.click()}
 disabled={avatarUploading}
 className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
 >
 {avatarUrl ? 'Change' : 'Upload'}
 </button>
 {avatarUrl && (
 <button
 type="button"
 onClick={() => setAvatarUrl('')}
 className="px-2 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
 >
 Remove
 </button>
 )}
 </div>
 </div>

 <div className="flex items-center justify-between gap-3 py-3">
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-14 h-10 rounded-lg bg-gradient-to-r from-brand-700 to-purple-800 text-white flex items-center justify-center overflow-hidden shrink-0">
 {coverUploading ? (
 <Loader2 className="w-4 h-4 animate-spin text-white" />
 ) : coverUrl ? (
 <img src={resolveMediaUrl(coverUrl)} alt="Cover preview" className="w-full h-full object-cover" />
 ) : (
 <ImageIcon className="w-4 h-4 text-white/80" />
 )}
 </div>
 <div className="min-w-0">
 <div className="text-xs font-bold text-slate-800">Cover Background</div>
 <div className="text-[11px] text-slate-500">Wide profile banner photo</div>
 </div>
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <button
 type="button"
 onClick={() => coverInputRef.current?.click()}
 disabled={coverUploading}
 className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
 >
 {coverUrl ? 'Change' : 'Upload'}
 </button>
 {coverUrl && (
 <button
 type="button"
 onClick={handleRemoveCover}
 disabled={coverUploading}
 className="px-2 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
 >
 Reset
 </button>
 )}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 required
 className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-200"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">City / Region</label>
 <input
 type="text"
 value={city}
 onChange={(e) => setCity(e.target.value)}
 required
 className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-200"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">Short Bio</label>
 <textarea
 rows={3}
 value={bio}
 onChange={(e) => setBio(e.target.value)}
 placeholder="Introduce yourself to neighbors and buyers..."
 className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-200"
 />
 </div>

 <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
 <button
 type="button"
 onClick={toggleEditing}
 className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={saveLoading || avatarUploading || coverUploading}
 className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 cursor-pointer disabled:opacity-50"
 >
 {saveLoading ? 'Saving...' : 'Save Changes'}
 </button>
 </div>
 </form>
 </ResponsiveSheet>

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
 </PullToRefresh>
 );
}
