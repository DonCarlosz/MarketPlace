import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import API, { resolveMediaUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMode } from '../context/ModeContext';
import { useToast } from '../context/ToastContext';
import {
 listingDetailCache,
 marketListingsCache,
 landingRouteCache,
 profileRouteCache,
} from '../utils/routeCache';
import { formatPrice } from '../utils/format';
import { NIGERIAN_CITY_LIST } from '../utils/geo';
import ResponsiveSheet from '../components/ResponsiveSheet';
import {
 Upload,
 X,
 RefreshCw,
 Sparkles,
 Wrench,
 MapPin,
 AlertCircle,
 Eye,
 CheckCircle2,
 ChevronRight,
 Star,
 Camera,
 Info,
 ArrowRight,
 ArrowLeft,
 Check,
 Building,
 Landmark,
 Store,
 Shield,
 GraduationCap,
 Truck,
 Loader2,
} from 'lucide-react';

const CATEGORIES_BY_MODE = {
 'second-hand': [
 'Electronics',
 'Furniture',
 'Vehicles',
 'Clothing & Shoes',
 'Home & Garden',
 'Sports & Outdoors',
 'Collectibles',
 'Tools',
 'Books & Games',
 'Other',
 ],
 new: [
 'Electronics',
 'Fashion & Apparel',
 'Home Decor',
 'Beauty & Personal Care',
 'Fitness & Gear',
 'Gadgets & Tech',
 'Handmade & Crafts',
 'Groceries & Snacks',
 'Other',
 ],
 service: [
 'Barbers & Hair',
 'Nail & Lash Techs',
 'Photography & Video',
 'Home Repair & Handyman',
 'Tutors & Lessons',
 'House Cleaning',
 'Auto Detailing & Mechanics',
 'Events & Catering',
 'Personal Trainers',
 'Other',
 ],
};

const CONDITION_TIERS = [
 {
 value: 'brand-new',
 label: 'Brand New',
 description: 'Unopened, with original packaging or tags. Never used.',
 },
 {
 value: 'like-new',
 label: 'Like New / Open Box',
 description: 'Flawless cosmetic condition, barely used, 100% operational.',
 },
 {
 value: 'good',
 label: 'Used - Good',
 description: 'Tested and fully working. Shows minor signs of regular use.',
 },
 {
 value: 'fair',
 label: 'Used - Fair',
 description: 'Visible scratches, dents, or aesthetic wear, but functions properly.',
 },
 {
 value: 'for-parts',
 label: 'For Parts / Repair',
 description: 'Has hardware or functional defects. Sold for spare components.',
 },
];

const SAFE_MEETUP_PRESETS = [
 {
 label: 'Shopping Mall / Plaza',
 icon: Building,
 text: 'Busy shopping mall / commercial plaza (main entrance or open car park).',
 },
 {
 label: 'Bank Branch / ATM Forecourt',
 icon: Landmark,
 text: 'Bank branch / ATM foyer (well-lit security camera coverage and parking).',
 },
 {
 label: 'Supermarket Car Park',
 icon: Store,
 text: 'Open supermarket customer car park with security guards and easy vehicle access.',
 },
 {
 label: 'Police Station / Security Post',
 icon: Shield,
 text: 'Designated safe-exchange zone outside local police station or security post.',
 },
 {
 label: 'University Campus Gate',
 icon: GraduationCap,
 text: 'University campus main security gate / open courtyard.',
 },
];

const NIGERIAN_CITIES = NIGERIAN_CITY_LIST.filter((c) => c !== 'All Locations');

export default function CreateListingPage() {
 const { id: editListingId } = useParams();
 const isEditMode = Boolean(editListingId);
 const { user, openAuthModal } = useAuth();
 const { mode: defaultMode, userLocation } = useMode();
 const { showToast } = useToast();
 const navigate = useNavigate();
 const [searchParams, setSearchParams] = useSearchParams();
 const [loadingEditListing, setLoadingEditListing] = useState(isEditMode);

 // Wizard Step (1: Classification, 2: Photos & Specifics, 3: Pricing & Meetup)
 const [step, setStep] = useState(1);

 // Step 1: Classification & Mode
 const [mode, setMode] = useState(defaultMode || 'second-hand');
 const [title, setTitle] = useState('');
 const [category, setCategory] = useState(CATEGORIES_BY_MODE[mode][0]);

 // Step 2: Media, Condition & Dynamic Specifics
 const [images, setImages] = useState([]);
 const [uploading, setUploading] = useState(false);
 const [condition, setCondition] = useState('good');
 const [hasFlaws, setHasFlaws] = useState(false);
 const [flawDescription, setFlawDescription] = useState('');
 const [description, setDescription] = useState('');

 // Category-specific structured key-values
 const [specifics, setSpecifics] = useState({
 brand: '',
 model: '',
 storageRam: '',
 color: '',
 yearMileage: '',
 materialSize: '',
 serviceScope: '',
 });

 // Step 3: Pricing, Negotiation & Safe Meetup
 const [price, setPrice] = useState('');
 const [priceType, setPriceType] = useState('fixed');
 const [acceptsOffers, setAcceptsOffers] = useState(true);
 const [minimumOfferPrice, setMinimumOfferPrice] = useState('');
 const [city, setCity] = useState(
 user?.location?.city ||
 (userLocation.city && userLocation.city !== 'All Locations' ? userLocation.city : 'Benin City')
 );
 const [neighborhood, setNeighborhood] = useState(user?.location?.neighborhood || '');
 const [preferredMeetup, setPreferredMeetup] = useState(SAFE_MEETUP_PRESETS[0].text);
 const [allowsDelivery, setAllowsDelivery] = useState(false);
 const [termsAgreed, setTermsAgreed] = useState(false);

 // Form Submission
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState(null);

 // AI Co-Pilot State
 const [aiModalOpen, setAiModalOpen] = useState(false);
 const [aiPrompt, setAiPrompt] = useState('');
 const [aiLoading, setAiLoading] = useState(false);
 const [aiDraftResult, setAiDraftResult] = useState(null);
 const [aiError, setAiError] = useState('');

 const handleGenerateAiDraft = async (customPrompt) => {
 const textToDraft = customPrompt || aiPrompt;
 if (!textToDraft.trim()) return;

 setAiLoading(true);
 setAiError('');
 try {
 const res = await API.post('/ai/draft-listing', {
 prompt: textToDraft,
 mode: mode,
 category: category,
 });

 if (res.data?.success && res.data.draft) {
 setAiDraftResult(res.data.draft);
 } else {
 throw new Error('Failed to generate draft.');
 }
 } catch (err) {
 setAiError(err.response?.data?.message || 'Failed to generate AI listing draft. Please try again.');
 } finally {
 setAiLoading(false);
 }
 };

 const handleApplyAiDraft = () => {
 if (!aiDraftResult) return;
 if (aiDraftResult.title) setTitle(aiDraftResult.title);
 if (aiDraftResult.description) setDescription(aiDraftResult.description);
 if (aiDraftResult.category && CATEGORIES_BY_MODE[mode]?.includes(aiDraftResult.category)) {
 setCategory(aiDraftResult.category);
 }
 if (aiDraftResult.condition) setCondition(aiDraftResult.condition);
 if (aiDraftResult.suggestedPrice) setPrice(aiDraftResult.suggestedPrice.toString());
 if (aiDraftResult.flawDescription) {
 setHasFlaws(true);
 setFlawDescription(aiDraftResult.flawDescription);
 }
 if (aiDraftResult.preferredMeetupAdvice) {
 setPreferredMeetup(aiDraftResult.preferredMeetupAdvice);
 }
 if (aiDraftResult.itemSpecifics) {
 setSpecifics((prev) => ({
 ...prev,
 brand: aiDraftResult.itemSpecifics.Brand || prev.brand,
 model: aiDraftResult.itemSpecifics.Model || prev.model,
 storageRam: aiDraftResult.itemSpecifics.Storage || aiDraftResult.itemSpecifics.RAM || prev.storageRam,
 color: aiDraftResult.itemSpecifics.Color || prev.color,
 }));
 }
 setAiModalOpen(false);
 setAiDraftResult(null);
 setAiPrompt('');
 };

 // Sync category when mode changes
 const handleModeChange = (newMode) => {
 setMode(newMode);
 setCategory(CATEGORIES_BY_MODE[newMode][0]);
 if (newMode === 'new') setCondition('brand-new');
 else if (newMode === 'second-hand') setCondition('good');
 else setCondition('not-applicable');
 };

 // Hydrate existing listing when editing (/edit/:id)
 useEffect(() => {
 if (!isEditMode || !editListingId) {
 setLoadingEditListing(false);
 return;
 }
 if (!user) return;

 let cancelled = false;
 const loadExistingListing = async () => {
 setLoadingEditListing(true);
 setError(null);
 try {
 const res = await API.get(`/listings/${editListingId}`);
 if (cancelled) return;
 if (!res.data?.success || !res.data.listing) {
 setError('Could not find this listing to edit.');
 return;
 }

 const existing = res.data.listing;
 const currentUserId = (user?._id || user?.id)?.toString();
 const ownerId = (existing.seller?._id || existing.seller?.id || existing.seller)?.toString();
 if (currentUserId && ownerId && currentUserId !== ownerId && user.role !== 'admin') {
 showToast('You can only edit your own listings.', 'error');
 navigate(`/listing/${editListingId}`, { replace: true });
 return;
 }

 const resolvedMode = ['second-hand', 'new', 'service'].includes(existing.mode)
 ? existing.mode
 : 'second-hand';
 setMode(resolvedMode);
 setTitle(existing.title || '');
 const modeCats = CATEGORIES_BY_MODE[resolvedMode] || CATEGORIES_BY_MODE['second-hand'];
 setCategory(modeCats.includes(existing.category) ? existing.category : existing.category || modeCats[0]);
 setImages(Array.isArray(existing.images) ? existing.images : []);
 setCondition(
 existing.condition ||
 (resolvedMode === 'new' ? 'brand-new' : resolvedMode === 'service' ? 'not-applicable' : 'good')
 );
 setHasFlaws(Boolean(existing.flawDescription && existing.flawDescription.trim()));
 setFlawDescription(existing.flawDescription || '');
 setDescription(existing.description || '');

 const rawSpecs = existing.itemSpecifics || {};
 setSpecifics({
 brand: rawSpecs.brand || rawSpecs.Brand || '',
 model: rawSpecs.model || rawSpecs.Model || '',
 storageRam: rawSpecs.storageRam || rawSpecs.Storage || rawSpecs.RAM || '',
 color: rawSpecs.color || rawSpecs.Color || '',
 yearMileage: rawSpecs.yearMileage || '',
 materialSize: rawSpecs.materialSize || '',
 serviceScope: existing.serviceType || rawSpecs.serviceScope || '',
 });

 setPrice(existing.price !== undefined && existing.price !== null ? String(existing.price) : '');
 setPriceType(existing.priceType || 'fixed');
 setAcceptsOffers(existing.acceptsOffers !== false);
 setMinimumOfferPrice(
 existing.minimumOfferPrice && Number(existing.minimumOfferPrice) > 0
 ? String(existing.minimumOfferPrice)
 : ''
 );
 setCity(existing.location?.city || user?.location?.city || 'Benin City');
 setNeighborhood(existing.location?.neighborhood || '');
 setPreferredMeetup(existing.preferredMeetup || SAFE_MEETUP_PRESETS[0].text);
 setAllowsDelivery(Boolean(existing.allowsDelivery));
 setTermsAgreed(true);
 } catch (err) {
 if (!cancelled) {
 setError(err.response?.data?.message || 'Failed to load listing for editing.');
 }
 } finally {
 if (!cancelled) setLoadingEditListing(false);
 }
 };

 loadExistingListing();
 return () => {
 cancelled = true;
 };
 }, [isEditMode, editListingId, user, navigate, showToast]);

 // Smart Category Keyword Suggestions (Create Mode only so Edit Mode never overwrites saved category)
 useEffect(() => {
 if (isEditMode) return;
 const t = title.toLowerCase();
 if (mode === 'service') {
 if (t.includes('hair') || t.includes('barber') || t.includes('braid') || t.includes('fade')) {
 setCategory('Barbers & Hair');
 } else if (t.includes('photo') || t.includes('video') || t.includes('shoot')) {
 setCategory('Photography & Video');
 } else if (t.includes('repair') || t.includes('plumb') || t.includes('handy')) {
 setCategory('Home Repair & Handyman');
 } else if (t.includes('tutor') || t.includes('lesson') || t.includes('math')) {
 setCategory('Tutors & Lessons');
 } else if (t.includes('mechanic') || t.includes('car') || t.includes('auto')) {
 setCategory('Auto Detailing & Mechanics');
 }
 } else {
 if (t.includes('iphone') || t.includes('samsung') || t.includes('laptop') || t.includes('phone') || t.includes('macbook')) {
 setCategory('Electronics');
 } else if (t.includes('car') || t.includes('bike') || t.includes('toyota') || t.includes('motor')) {
 setCategory('Vehicles');
 } else if (t.includes('sofa') || t.includes('table') || t.includes('chair') || t.includes('bed')) {
 setCategory('Furniture');
 } else if (t.includes('shirt') || t.includes('shoe') || t.includes('dress') || t.includes('hoodie')) {
 setCategory(mode === 'new' ? 'Fashion & Apparel' : 'Clothing & Shoes');
 }
 }
 }, [title, mode]);

 // Scroll to top on step change
 useEffect(() => {
 window.scrollTo({ top: 0, behavior: 'smooth' });
 }, [step]);

 // Web Share Target receiver: auto-import photos & text shared directly from phone Gallery into /create?shared=1
 useEffect(() => {
 if (searchParams.get('shared') !== '1' || typeof caches === 'undefined') return;
 let cancelled = false;

 const consumeSharedPayload = async () => {
 try {
 const cache = await caches.open('obuy-share-target-v1');
 const metaRes = await cache.match('/__shared_meta');
 if (!metaRes) return;

 const meta = await metaRes.json();
 if (cancelled) return;

 if (meta.title && !title) setTitle(String(meta.title).slice(0, 80));
 const combinedText = [meta.text, meta.url].filter(Boolean).join('\n').trim();
 if (combinedText && !description) setDescription(combinedText);

 const fileKeys = Array.isArray(meta.files) ? meta.files : [];
 if (fileKeys.length > 0 && user) {
 setUploading(true);
 const formData = new FormData();
 let appended = 0;
 for (const key of fileKeys) {
 const fileRes = await cache.match(key);
 if (!fileRes) continue;
 const blob = await fileRes.blob();
 const fileName = decodeURIComponent(fileRes.headers.get('X-File-Name') || 'shared-photo.jpg');
 formData.append('images', new File([blob], fileName, { type: blob.type || 'image/jpeg' }));
 appended += 1;
 }
 if (appended > 0) {
 const upRes = await API.post('/upload', formData, {
 headers: { 'Content-Type': 'multipart/form-data' },
 });
 if (!cancelled && upRes.data?.success && upRes.data.images?.length > 0) {
 setImages((prev) => [...prev, ...upRes.data.images].slice(0, 12));
 showToast(`Imported ${upRes.data.images.length} shared photo${upRes.data.images.length > 1 ? 's' : ''} into your listing.`, 'success');
 }
 }
 }

 await caches.delete('obuy-share-target-v1');
 } catch {
 // Non-blocking if share cache was unavailable
 } finally {
 if (!cancelled) {
 setUploading(false);
 setSearchParams({}, { replace: true });
 }
 }
 };

 consumeSharedPayload();
 return () => {
 cancelled = true;
 };
 }, [searchParams, user, setSearchParams, showToast]);

 // Image Upload Handlers
 const handleImageUpload = async (e) => {
 const files = Array.from(e.target.files);
 if (!files.length) return;

 if (images.length + files.length > 12) {
 setError('You can upload a maximum of 12 photos per listing.');
 e.target.value = '';
 return;
 }

 setUploading(true);
 setError(null);

 const formData = new FormData();
 files.forEach((file) => formData.append('images', file));

 try {
 const res = await API.post('/upload', formData, {
 headers: { 'Content-Type': 'multipart/form-data' },
 });

 if (res.data?.success && res.data.images) {
 setImages((prev) => [...prev, ...res.data.images]);
 } else {
 setError('Image upload did not return any saved photos. Please try again.');
 }
 } catch (err) {
 console.error('Image upload failed:', err);
 setError(
 err.response?.data?.message ||
 'Failed to upload photos. Ensure each image is JPG, PNG, or WebP under 8MB.'
 );
 } finally {
 setUploading(false);
 e.target.value = '';
 }
 };

 const removeImage = (index) => {
 setImages((prev) => prev.filter((_, i) => i !== index));
 };

 // Set any photo as the Primary Cover Photo (index 0)
 const setCoverPhoto = (index) => {
 if (index === 0) return;
 setImages((prev) => {
 const copy = [...prev];
 const [target] = copy.splice(index, 1);
 return [target, ...copy];
 });
 };

 // Specifics helper
 const handleSpecificChange = (key, val) => {
 setSpecifics((prev) => ({ ...prev, [key]: val }));
 };

 // Step 1 validation
 const handleStep1Next = () => {
 if (!title.trim() || title.trim().length < 4) {
 setError('Please provide a descriptive title (at least 4 characters).');
 return;
 }
 setError(null);
 setStep(2);
 };

 // Step 2 validation
 const handleStep2Next = () => {
 if (!description.trim() || description.trim().length < 10) {
 setError('Please provide a short description (at least 10 characters) explaining your listing.');
 return;
 }
 setError(null);
 setStep(3);
 };

 // Final Form Submission
 const handleSubmit = async (e) => {
 e.preventDefault();
 setError(null);

 if (!termsAgreed) {
 setError('Please acknowledge the safe in-person meetup agreement before publishing.');
 return;
 }

 if (price === '' || isNaN(Number(price))) {
 setError('Please enter a valid price in Naira (₦0 for free/quote).');
 return;
 }

 if (!city.trim()) {
 setError('Please select or enter your city or town.');
 return;
 }

 setSubmitting(true);

 try {
 // Build clean key-value specifics object
 const itemSpecifics = {};
 Object.entries(specifics).forEach(([k, v]) => {
 if (v && v.trim()) itemSpecifics[k] = v.trim();
 });

 const payload = {
 mode,
 title: title.trim(),
 description: description.trim(),
 price: Number(price),
 priceType,
 category,
 condition: mode === 'service' ? 'not-applicable' : condition,
 serviceType: mode === 'service' ? specifics.serviceScope || '' : undefined,
 images: images.map((img) => ({ url: img.url })),
 itemSpecifics,
 flawDescription: hasFlaws ? flawDescription.trim() : '',
 acceptsOffers,
 minimumOfferPrice: acceptsOffers && minimumOfferPrice ? Number(minimumOfferPrice) : 0,
 allowsDelivery,
 city: city.trim(),
 neighborhood: neighborhood.trim(),
 preferredMeetup: preferredMeetup.trim(),
 };

 const res = isEditMode
 ? await API.put(`/listings/${editListingId}`, payload)
 : await API.post('/listings', payload);

 if (res.data?.success && (res.data.listing?._id || editListingId)) {
 const targetId = res.data.listing?._id || editListingId;
 listingDetailCache.delete(targetId);
 marketListingsCache.clear();
 landingRouteCache.clear();
 profileRouteCache.clear();
 showToast(
 isEditMode ? 'Listing changes saved successfully.' : 'Listing published successfully!',
 'success'
 );
 navigate(`/listing/${targetId}`);
 }
 } catch (err) {
 console.error(isEditMode ? 'Failed to update listing:' : 'Failed to publish listing:', err);
 setError(
 err.response?.data?.message ||
 (isEditMode
 ? 'Failed to update listing. Please try again.'
 : 'Failed to publish listing. Please try again.')
 );
 } finally {
 setSubmitting(false);
 }
 };

 if (loadingEditListing && user) {
 return (
 <div className="min-h-[60vh] bg-slate-50 flex flex-col items-center justify-center p-6 gap-3">
 <Loader2 className="w-7 h-7 text-brand-600 animate-spin" />
 <p className="text-xs font-bold text-slate-500">Loading your listing details...</p>
 </div>
 );
 }

 if (!user) {
 return (
 <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
 <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-md w-full text-center space-y-4 ">
 <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto">
 <AlertCircle className="w-6 h-6" />
 </div>
 <h2 className="text-xl font-bold text-slate-900">Sign in to Post a Listing</h2>
 <p className="text-xs text-slate-500">
 You need a verified account to create listings and communicate with local buyers and clients.
 </p>
 <div className="flex gap-3 pt-2">
 <button
 onClick={() => openAuthModal('login')}
 className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition"
 >
 Log In
 </button>
 <button
 onClick={() => openAuthModal('register')}
 className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
 >
 Create Account
 </button>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-slate-50 sm:py-8 sm:px-6 lg:px-8">
 <div className="max-w-7xl mx-auto sm:space-y-6">
 {/* Wizard Top Header (flat edge-to-edge on mobile) */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white sm:bg-transparent px-4 py-4 sm:px-0 sm:pt-0 sm:pb-3 border-b border-slate-200">
 <div>
 <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
 {isEditMode ? 'Edit Listing' : 'Create a Listing'}
 </h1>
 <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
 {isEditMode
 ? 'Update your price, photos, specifics, or meetup details anytime without losing your chats or views.'
 : 'Publish pre-loved items, factory-sealed goods, or local handwork across Nigeria.'}
 </p>
 </div>

 {/* Stepper Progress Badges */}
 <div className="flex items-center gap-2 select-none">
 {/* Step 1 Pill */}
 <button
 type="button"
 onClick={() => (isEditMode || step > 1) && setStep(1)}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
 step === 1
 ? 'bg-brand-600 text-white '
 : isEditMode || step > 1
 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer'
 : 'bg-slate-100 text-slate-400 cursor-not-allowed'
 }`}
 >
 <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/20">
 {step > 1 ? <Check className="w-3 h-3 stroke-[3]" /> : '1'}
 </span>
 <span>Item</span>
 </button>

 <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

 {/* Step 2 Pill */}
 <button
 type="button"
 onClick={() => (isEditMode || step > 2) && setStep(2)}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
 step === 2
 ? 'bg-brand-600 text-white '
 : isEditMode || step > 2
 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer'
 : 'bg-slate-100 text-slate-400 cursor-not-allowed'
 }`}
 >
 <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/20">
 {step > 2 ? <Check className="w-3 h-3 stroke-[3]" /> : '2'}
 </span>
 <span>Specifics</span>
 </button>

 <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

 {/* Step 3 Pill */}
 <button
 type="button"
 onClick={() => isEditMode && setStep(3)}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
 step === 3
 ? 'bg-brand-600 text-white '
 : isEditMode
 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer'
 : 'bg-slate-100 text-slate-400 cursor-default'
 }`}
 >
 <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/20">
 3
 </span>
 <span>Pricing</span>
 </button>
 </div>
 </div>

 {/* Global Error Alert */}
 {error && (
 <div className="mx-4 sm:mx-0 mt-3 sm:mt-0 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5">
 <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
 <span className="font-semibold">{error}</span>
 </div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-12 sm:gap-8 items-start">
 {/* Main Wizard Form (8 Columns) */}
 <div className="lg:col-span-8 sm:space-y-5">
 {/* ================= STEP 1: ITEM & CLASSIFICATION ================= */}
 {step === 1 && (
 <div className="space-y-0 sm:space-y-5 animate-in fade-in duration-200">
 {/* AI Listing Wizard Co-Pilot Banner */}
 <div className="px-4 py-4 sm:p-5 sm:rounded-2xl bg-brand-50/70 border-b sm:border border-brand-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shrink-0">
 <Sparkles className="w-5 h-5 text-amber-300" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className="text-xs font-bold text-slate-900">
 Want AI to draft this listing for you?
 </h3>
 <span className="px-2 py-0.5 rounded-full bg-brand-600 text-white text-[10px] font-black uppercase tracking-wider">
 oBuy AI
 </span>
 </div>
 <p className="text-[11px] text-slate-500 mt-0.5">
 Describe what you are selling or paste rough notes. AI will write your title, description, and calculate realistic Nigerian market pricing.
 </p>
 </div>
 </div>

 <button
 type="button"
 onClick={() => setAiModalOpen(true)}
 className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shrink-0 cursor-pointer"
 >
 <Sparkles className="w-3.5 h-3.5 text-amber-300" />
 <span>Launch AI Co-Pilot</span>
 </button>
 </div>
 {/* 1.1 Trading Mode Selection */}
 <div className="bg-white border-b sm:border border-slate-200 sm:rounded-2xl px-4 py-5 sm:p-6 space-y-3">
 <div className="flex items-center justify-between">
 <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
 Trading Mode
 </label>
 <span className="text-[11px] text-slate-500 font-medium">Choose how you want to list</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {/* Second-Hand */}
 <button
 type="button"
 onClick={() => handleModeChange('second-hand')}
 className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer relative ${
 mode === 'second-hand'
 ? 'border-brand-600 bg-brand-50/50 text-brand-950 ring-2 ring-brand-100'
 : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
 }`}
 >
 <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center mb-2.5">
 <RefreshCw className="w-4 h-4" />
 </div>
 <h4 className="text-sm font-bold">Second-hand</h4>
 <p className="text-[11px] text-slate-500 mt-1 leading-snug">
 Pre-loved graded gadgets, furniture, road bikes, tools
 </p>
 {mode === 'second-hand' && (
 <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
 <Check className="w-3 h-3 stroke-[3]" />
 </div>
 )}
 </button>

 {/* Brand New */}
 <button
 type="button"
 onClick={() => handleModeChange('new')}
 className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer relative ${
 mode === 'new'
 ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-100'
 : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
 }`}
 >
 <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5">
 <Sparkles className="w-4 h-4" />
 </div>
 <h4 className="text-sm font-bold">Brand-New</h4>
 <p className="text-[11px] text-slate-500 mt-1 leading-snug">
 Factory-sealed electronics, boutique fashion, crafts
 </p>
 {mode === 'new' && (
 <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
 <Check className="w-3 h-3 stroke-[3]" />
 </div>
 )}
 </button>

 {/* Services */}
 <button
 type="button"
 onClick={() => handleModeChange('service')}
 className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer relative ${
 mode === 'service'
 ? 'border-purple-600 bg-purple-50/50 text-purple-950 ring-2 ring-purple-100'
 : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
 }`}
 >
 <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2.5">
 <Wrench className="w-4 h-4" />
 </div>
 <h4 className="text-sm font-bold">Local Services</h4>
 <p className="text-[11px] text-slate-500 mt-1 leading-snug">
 Barbers, braiders, mechanics, phone repair, tutors
 </p>
 {mode === 'service' && (
 <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
 <Check className="w-3 h-3 stroke-[3]" />
 </div>
 )}
 </button>
 </div>
 </div>

 {/* 1.2 Title Input with Live Length Indicator */}
 <div className="bg-white border-b sm:border border-slate-200 sm:rounded-2xl px-4 py-5 sm:p-6 space-y-4">
 <div className="flex items-center justify-between">
 <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
 Listing Title <span className="text-rose-500">*</span>
 </label>
 <div className="flex items-center gap-2">
 <span
 className={`text-xs font-bold px-2 py-0.5 rounded-md ${
 title.length >= 20 && title.length <= 80
 ? 'bg-emerald-50 text-emerald-700'
 : title.length > 0
 ? 'bg-amber-50 text-amber-700'
 : 'text-slate-400'
 }`}
 >
 {title.length}/80 characters
 </span>
 </div>
 </div>

 <input
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder={
 mode === 'service'
 ? 'e.g., Professional Fade Haircut & Beard Grooming in Benin'
 : 'e.g., Apple iPhone 14 Pro Max 256GB Deep Purple Unlocked'
 }
 maxLength={80}
 className="w-full text-sm sm:text-base font-medium border border-slate-300 rounded-2xl p-4 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition"
 />

 <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
 <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
 <p className="leading-relaxed">
 <strong>oBuy Title Best Practice:</strong> Include brand, model, key technical specs, and color. Avoid vague titles like "Used phone for sale".
 </p>
 </div>
 </div>

 {/* 1.3 Category Picker */}
 <div className="bg-white border-b sm:border border-slate-200 sm:rounded-2xl px-4 py-5 sm:p-6 space-y-3">
 <div className="flex items-center justify-between">
 <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
 Category <span className="text-rose-500">*</span>
 </label>
 <span className="text-[11px] text-brand-600 font-semibold">
 Selected: {category}
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
 {CATEGORIES_BY_MODE[mode].map((catName) => {
 const isSelected = category === catName;
 return (
 <button
 key={catName}
 type="button"
 onClick={() => setCategory(catName)}
 className={`px-3 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
 isSelected
 ? 'bg-brand-600 text-white border-brand-600 '
 : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80'
 }`}
 >
 <span className="line-clamp-1">{catName}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Step 1 Actions */}
 <div className="flex justify-end px-4 py-4 sm:px-0 sm:pt-2">
 <button
 type="button"
 onClick={handleStep1Next}
 className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-2xl transition inline-flex items-center gap-2 cursor-pointer active:scale-95"
 >
 <span>Continue to Photos & Specifics</span>
 <ArrowRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}

 {/* ================= STEP 2: PHOTOS & SPECIFICS ================= */}
 {step === 2 && (
 <div className="space-y-0 sm:space-y-5 animate-in fade-in duration-200">
 {/* 2.1 Multi-Photo Drag & Drop Gallery */}
 <div className="bg-white border-b sm:border border-slate-200 sm:rounded-2xl px-4 py-5 sm:p-6 space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
 Listing Photos ({images.length}/12)
 </label>
 <p className="text-[11px] text-slate-500 mt-0.5">
 First photo will be your primary search cover image. Click any photo to make it cover.
 </p>
 </div>
 {images.length > 0 && (
 <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
 {images.length} added
 </span>
 )}
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
 {images.map((img, index) => {
 const isCover = index === 0;
 return (
 <div
 key={index}
 className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition group ${
 isCover ? 'border-brand-600 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'
 }`}
 >
 <img src={resolveMediaUrl(img.url)} alt="" className="w-full h-full object-cover" />

 {/* Cover Badge or Set-as-Cover Button */}
 {isCover ? (
 <span className="absolute top-1.5 left-1.5 bg-brand-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
 <Star className="w-2.5 h-2.5 fill-white" />
 Cover
 </span>
 ) : (
 <button
 type="button"
 onClick={() => setCoverPhoto(index)}
 title="Make this the Cover Photo"
 className="absolute top-1.5 left-1.5 bg-slate-900/80 hover:bg-brand-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md transition opacity-0 group-hover:opacity-100 flex items-center gap-1 cursor-pointer"
 >
 <Star className="w-2.5 h-2.5" />
 Set Cover
 </button>
 )}

 {/* Delete Photo Button */}
 <button
 type="button"
 onClick={() => removeImage(index)}
 title="Remove photo"
 className="absolute top-1.5 right-1.5 p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
 >
 <X className="w-3 h-3" />
 </button>
 </div>
 );
 })}

 {/* Add More Photos Dropzone */}
 {images.length < 12 && (
 <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-500 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 hover:bg-brand-50/40 p-2 text-center group">
 <input
 type="file"
 accept="image/*"
 multiple
 onChange={handleImageUpload}
 disabled={uploading}
 className="hidden"
 />
 <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 group-hover:border-brand-300 group-hover:text-brand-600 text-slate-400 flex items-center justify-center mb-1 transition ">
 <Upload className="w-4 h-4" />
 </div>
 <span className="text-[10px] text-slate-600 font-bold">
 {uploading ? 'Uploading...' : 'Add Photos'}
 </span>
 <span className="text-[9px] text-slate-400 mt-0.5">Up to 12</span>
 </label>
 )}
 </div>

 <div className="p-3 bg-brand-50/60 border border-brand-100 rounded-2xl text-[11px] text-brand-900 leading-relaxed flex items-start gap-2">
 <Camera className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
 <span>
 <strong>Photo Tip:</strong> Take clear photos in natural daylight. Photograph all sides, ports, labels, and cosmetic flaws to build trust with buyers.
 </span>
 </div>
 </div>

 {/* 2.2 Condition Grading (Goods Only) */}
 {mode !== 'service' && (
 <div className="bg-white border-b sm:border border-slate-200 sm:rounded-2xl px-4 py-5 sm:p-6 space-y-4">
 <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
 Item Condition <span className="text-rose-500">*</span>
 </label>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {CONDITION_TIERS.map((tier) => {
 const isSelected = condition === tier.value;
 return (
 <button
 key={tier.value}
 type="button"
 onClick={() => setCondition(tier.value)}
 className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
 isSelected
 ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-200'
 : 'border-slate-200 hover:border-slate-300 bg-white'
 }`}
 >
 <div className="flex items-center justify-between mb-1">
 <span className="font-bold text-xs text-slate-900">{tier.label}</span>
 {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 stroke-[3]" />}
 </div>
 <p className="text-[11px] text-slate-500 leading-relaxed">
 {tier.description}
 </p>
 </button>
 );
 })}
 </div>

 {/* Flaw Disclosure Section */}
 <div className="pt-3 border-t border-slate-100 space-y-2.5">
 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 id="flawsToggle"
 checked={hasFlaws}
 onChange={(e) => setHasFlaws(e.target.checked)}
 className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
 />
 <label htmlFor="flawsToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
 This item has cosmetic or functional flaws (scratches, dents, battery wear, missing accessories)
 </label>
 </div>

 {hasFlaws && (
 <textarea
 rows={2}
 value={flawDescription}
 onChange={(e) => setFlawDescription(e.target.value)}
 placeholder="Describe the flaws honestly (e.g. Minor scratches on back glass, battery health at 84%, comes without original charger)..."
 className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-brand-600"
 />
 )}
 </div>
 </div>
 )}

 {/* 2.3 Dynamic Structured Specifics */}
 <div className="bg-white border-b sm:border border-slate-200 sm:rounded-2xl px-4 py-5 sm:p-6 space-y-4">
 <div className="flex items-center justify-between">
 <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
 Item Specifics ({category})
 </label>
 <span className="text-[11px] text-slate-400">Helps buyers find your item via search filters</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Brand */}
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">Brand / Maker</label>
 <input
 type="text"
 value={specifics.brand}
 onChange={(e) => handleSpecificChange('brand', e.target.value)}
 placeholder="e.g., Apple, Toyota, Samsung, Nike, IKEA"
 className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-brand-600"
 />
 </div>

 {/* Model / Series */}
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">Model / Series</label>
 <input
 type="text"
 value={specifics.model}
 onChange={(e) => handleSpecificChange('model', e.target.value)}
 placeholder="e.g., iPhone 14 Pro, Corolla, Galaxy S23, Air Max"
 className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-brand-600"
 />
 </div>

 {/* Tech / Specs (Storage or RAM or Fuel) */}
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 {mode === 'service' ? 'Service Format' : 'Storage / Specs / Mileage'}
 </label>
 <input
 type="text"
 value={specifics.storageRam}
 onChange={(e) => handleSpecificChange('storageRam', e.target.value)}
 placeholder={
 mode === 'service'
 ? 'e.g., In-Shop, Mobile / Home Visits, or Remote'
 : 'e.g., 256GB / 8GB RAM, 85,000 km, or V6 Engine'
 }
 className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-brand-600"
 />
 </div>

 {/* Color or Material */}
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 {mode === 'service' ? 'Tools / Materials Included' : 'Color / Material / Size'}
 </label>
 <input
 type="text"
 value={specifics.color}
 onChange={(e) => handleSpecificChange('color', e.target.value)}
 placeholder={
 mode === 'service'
 ? 'e.g., All barbering tools provided, client brings hair weave'
 : 'e.g., Space Gray, Genuine Leather, Size 43, 6x6 ft'
 }
 className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-brand-600"
 />
 </div>
 </div>
 </div>

 {/* 2.4 Detailed Description */}
 <div className="bg-white border-b sm:border border-slate-200 sm:rounded-2xl px-4 py-5 sm:p-6 space-y-3">
 <div className="flex items-center justify-between">
 <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
 Detailed Description <span className="text-rose-500">*</span>
 </label>
 <span className="text-[11px] text-slate-400">{description.length} characters</span>
 </div>

 <textarea
 rows={5}
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Describe the item or service in detail. Mention usage duration, reason for selling, inclusions in the box, and terms of service..."
 className="w-full text-xs sm:text-sm border border-slate-300 rounded-2xl p-4 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition"
 />
 </div>

 {/* Step 2 Actions */}
 <div className="flex items-center justify-between px-4 py-4 sm:px-0 sm:pt-2 gap-2">
 <button
 type="button"
 onClick={() => setStep(1)}
 className="px-6 py-3 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl transition inline-flex items-center gap-2 cursor-pointer"
 >
 <ArrowLeft className="w-4 h-4" />
 <span>Back to Item</span>
 </button>

 <button
 type="button"
 onClick={handleStep2Next}
 className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-2xl transition inline-flex items-center gap-2 cursor-pointer active:scale-95"
 >
 <span>Continue to Pricing & Meetup</span>
 <ArrowRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}

 {/* ================= STEP 3: PRICING & SAFE MEETUP ================= */}
 {step === 3 && (
 <form onSubmit={handleSubmit} className="space-y-0 sm:space-y-5 animate-in fade-in duration-200">
 {/* 3.1 Price & Format */}
 <div className="bg-white border-b sm:border border-slate-200 sm:rounded-2xl px-4 py-5 sm:p-6 space-y-4">
 <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
 Pricing & Format <span className="text-rose-500">*</span>
 </label>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Price (in Nigerian Naira ₦)
 </label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
 ₦
 </span>
 <input
 type="number"
 min="0"
 step="any"
 value={price}
 onChange={(e) => setPrice(e.target.value)}
 placeholder="e.g., 45000 (0 for Free)"
 required
 className="w-full pl-8 pr-4 py-3.5 text-base font-bold border border-slate-300 rounded-2xl focus:outline-none focus:border-brand-600"
 />
 </div>
 {price && !isNaN(Number(price)) && (
 <p className="text-[11px] font-bold text-emerald-600 mt-1 pl-1">
 Displays as: {formatPrice(Number(price))}
 </p>
 )}
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">Price Structure</label>
 <select
 value={priceType}
 onChange={(e) => setPriceType(e.target.value)}
 className="w-full py-3.5 px-4 text-xs sm:text-sm border border-slate-300 rounded-2xl bg-white focus:outline-none cursor-pointer"
 >
 <option value="fixed">Fixed Price</option>
 <option value="negotiable">Negotiable</option>
 <option value="starting-at">Starting At (Base Rate)</option>
 <option value="hourly">Hourly Rate</option>
 <option value="free">Free / Quote</option>
 </select>
 </div>
 </div>

 {/* 3.2 Negotiation / Offers Toggle */}
 <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <span className="text-xs font-bold text-slate-900 block">
 Accept Price Offers from Buyers
 </span>
 <span className="text-[11px] text-slate-500">
 Recommended. Listings that accept offers sell 2.5x faster.
 </span>
 </div>
 <input
 type="checkbox"
 checked={acceptsOffers}
 onChange={(e) => setAcceptsOffers(e.target.checked)}
 className="w-5 h-5 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
 />
 </div>

 {acceptsOffers && (
 <div className="pt-2 border-t border-slate-200/80">
 <label className="block text-[11px] font-semibold text-slate-700 mb-1">
 Minimum Acceptable Offer (Optional Auto-Decline)
 </label>
 <div className="relative max-w-xs">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xs">
 ₦
 </span>
 <input
 type="number"
 min="0"
 value={minimumOfferPrice}
 onChange={(e) => setMinimumOfferPrice(e.target.value)}
 placeholder="e.g. 35000 (Auto-decline lower)"
 className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-brand-600"
 />
 </div>
 <span className="text-[10px] text-slate-400 mt-1 block">
 Offers lower than this amount are filtered out so you don't get spammed.
 </span>
 </div>
 )}
 </div>
 </div>

 {/* 3.3 Location & Safe Meetup Presets */}
 <div className="bg-white border-b sm:border border-slate-200 sm:rounded-2xl px-4 py-5 sm:p-6 space-y-4">
 <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
 Location & Safe Meetup Guidance <span className="text-rose-500">*</span>
 </label>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 City / Town in Nigeria
 </label>
 <select
 value={city}
 onChange={(e) => setCity(e.target.value)}
 className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 bg-white focus:outline-none cursor-pointer"
 >
 {NIGERIAN_CITIES.map((c) => (
 <option key={c} value={c}>
 {c}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Neighborhood / Area
 </label>
 <input
 type="text"
 value={neighborhood}
 onChange={(e) => setNeighborhood(e.target.value)}
 placeholder="e.g. GRA, Ring Road, Campus Gate, Ikeja"
 className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-brand-600"
 />
 </div>
 </div>

 {/* One-Click Safe Meetup Spot Chips */}
 <div className="space-y-2 pt-1">
 <label className="block text-xs font-semibold text-slate-700">
 Recommended Safe Public Meetup Points:
 </label>
 <div className="flex flex-wrap gap-2">
 {SAFE_MEETUP_PRESETS.map((preset) => {
 const IconComponent = preset.icon;
 const isSelected = preferredMeetup === preset.text;
 return (
 <button
 key={preset.label}
 type="button"
 onClick={() => setPreferredMeetup(preset.text)}
 className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
 isSelected
 ? 'bg-brand-50 border-brand-500 text-brand-700 '
 : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
 }`}
 >
 <IconComponent className="w-3.5 h-3.5 text-brand-600" />
 <span>{preset.label}</span>
 </button>
 );
 })}
 </div>

 <input
 type="text"
 value={preferredMeetup}
 onChange={(e) => setPreferredMeetup(e.target.value)}
 placeholder="Custom meetup point or notes..."
 className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none mt-2"
 />
 </div>

 {/* Delivery Option */}
 <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
 <input
 type="checkbox"
 id="deliveryToggle"
 checked={allowsDelivery}
 onChange={(e) => setAllowsDelivery(e.target.checked)}
 className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
 />
 <label htmlFor="deliveryToggle" className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5">
 <Truck className="w-4 h-4 text-slate-500" />
 <span>I can also offer local hand-delivery within my town</span>
 </label>
 </div>
 </div>

 {/* 3.4 Safety & Terms Agreement */}
 <div className="bg-amber-50/80 border-b sm:border border-amber-200/90 sm:rounded-2xl px-4 py-4 sm:p-5 space-y-2">
 <div className="flex items-start gap-3">
 <input
 type="checkbox"
 id="terms"
 checked={termsAgreed}
 onChange={(e) => setTermsAgreed(e.target.checked)}
 className="mt-1 h-4 w-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
 />
 <label htmlFor="terms" className="text-xs text-amber-950 leading-relaxed cursor-pointer">
 <strong>Direct Safe Deal Blueprint:</strong> I agree that all transactions take place in-person with thorough inspection before payment. oBuy charges zero commission and assumes no liability for off-platform funds.
 </label>
 </div>
 </div>

 {/* Step 3 Actions */}
 <div className="flex items-center justify-between px-4 py-4 sm:px-0 sm:pt-2 gap-2">
 <button
 type="button"
 onClick={() => setStep(2)}
 className="px-6 py-3 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl transition inline-flex items-center gap-2 cursor-pointer"
 >
 <ArrowLeft className="w-4 h-4" />
 <span>Back to Specifics</span>
 </button>

 <button
 type="submit"
 disabled={submitting}
 className="px-8 py-3.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-black text-sm rounded-2xl transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
 >
 {submitting ? (
 <span>{isEditMode ? 'Saving Changes...' : 'Publishing Listing...'}</span>
 ) : (
 <>
 <span>{isEditMode ? 'Save Listing Changes' : 'Publish Listing Now'}</span>
 <Check className="w-4 h-4 stroke-[3]" />
 </>
 )}
 </button>
 </div>
 </form>
 )}
 </div>

 {/* Right Sticky Column: Live Listing Card Preview (4 Columns) */}
 <div className="hidden lg:block lg:col-span-4">
 <div className="sticky top-24 space-y-4">
 <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
 <Eye className="w-4 h-4 text-brand-600" />
 <span>Live Marketplace Preview</span>
 </div>

 {/* Preview Card */}
 <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 select-none">
 <div className="relative aspect-square rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200/80">
 {images.length > 0 ? (
 <img src={resolveMediaUrl(images[0].url)} alt="" className="w-full h-full object-cover" />
 ) : (
 <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
 <Camera className="w-8 h-8 stroke-1 text-slate-300" />
 <span className="text-[11px] font-medium text-slate-400">Photos will preview here</span>
 </div>
 )}

 {/* Mode Badge */}
 <div className="absolute top-2 left-2 flex items-center gap-1">
 {mode === 'new' && (
 <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded ">
 New
 </span>
 )}
 {mode === 'service' && (
 <span className="bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded ">
 Service
 </span>
 )}
 {mode === 'second-hand' && (
 <span className="bg-brand-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded ">
 Used
 </span>
 )}
 {mode !== 'service' && condition && (
 <span className="bg-slate-900/80 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
 {condition === 'brand-new' ? 'Sealed' : condition}
 </span>
 )}
 </div>

 {acceptsOffers && (
 <div className="absolute bottom-2 right-2 bg-brand-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
 Accepts Offers
 </div>
 )}
 </div>

 <div className="space-y-1">
 <div className="text-lg font-black text-slate-900">
 {price && !isNaN(Number(price)) ? formatPrice(Number(price)) : '₦0'}
 <span className="text-[11px] font-normal text-slate-500 ml-1">
 ({priceType === 'fixed' ? 'Fixed' : priceType})
 </span>
 </div>
 <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
 {title || 'Your listing title will preview here...'}
 </h4>
 <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
 <span className="flex items-center gap-1 truncate">
 <MapPin className="w-3 h-3 text-slate-400" />
 {city || 'Location'}
 </span>
 <span className="font-semibold text-slate-600 shrink-0">{category}</span>
 </div>
 </div>
 </div>

 {/* Trust Callout */}
 <div className="p-3.5 bg-brand-50/70 border border-brand-100 rounded-2xl text-[11px] text-brand-900 space-y-1">
 <p className="font-bold flex items-center gap-1 text-brand-800">
 <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
 Buyer Inquiries & Offers
 </p>
 <p className="text-brand-700/80 leading-relaxed">
 Interested buyers will chat with you directly in-app. You can accept or counter offers with one tap.
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* AI Listing Wizard Co-Pilot Sheet / Modal */}
 <ResponsiveSheet
 open={aiModalOpen}
 onClose={() => setAiModalOpen(false)}
 title="Listing Wizard AI Co-Pilot"
 description="Auto-generate title, specs, description, and Nigerian market price"
 maxWidth="max-w-2xl"
 showDefaultHeader={false}
 headerSlot={
 <div className="flex items-start justify-between gap-3 px-5 py-3.5 sm:px-6 sm:py-5 border-b border-slate-100">
 <div className="flex items-center gap-2.5 min-w-0">
 <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
 <Sparkles className="w-4 h-4 text-amber-300" />
 </div>
 <div className="min-w-0">
 <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
 Listing Wizard AI Co-Pilot
 </h3>
 <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
 Auto-generate title, specs, description, and Nigerian market price
 </p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setAiModalOpen(false)}
 className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 }
 bodyClassName="p-4 sm:p-6 space-y-4"
 >

 {/* Error if any */}
 {aiError && (
 <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
 <AlertCircle className="w-4 h-4 shrink-0" />
 <span>{aiError}</span>
 </div>
 )}

 {!aiDraftResult ? (
 <div className="space-y-4">
 <div>
 <label className="block text-xs font-bold text-slate-700 mb-1.5">
 What are you selling? (Enter rough notes or bullet points)
 </label>
 <textarea
 rows={4}
 value={aiPrompt}
 onChange={(e) => setAiPrompt(e.target.value)}
 placeholder="e.g. Clean UK-used HP EliteBook 840 G6 in Uromi. Core i5, 16GB RAM, 512GB SSD, 4 hours battery backup. Minor scratch on bezel, charger included. Looking for 240k."
 className="w-full text-xs border border-slate-300 rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-brand-200 text-slate-900 leading-relaxed"
 />
 </div>

 {/* Quick Samples */}
 <div>
 <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
 Or try a sample template:
 </span>
 <div className="flex flex-wrap gap-1.5">
 {[
 'iPhone 12 Pro 128GB Pacific Blue in Uromi, 85% battery, clean condition',
 'Hisense 43-Inch Smart 4K TV with remote, Netflix/YouTube ready, excellent display',
 'Lutian 3.5kVA key-start generator, 100% copper coil, powers freezer and AC',
 'Solar inverter installation & residential conduit wiring in Uromi',
 ].map((sample, sIdx) => (
 <button
 key={sIdx}
 type="button"
 onClick={() => {
 setAiPrompt(sample);
 handleGenerateAiDraft(sample);
 }}
 disabled={aiLoading}
 className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-[11px] font-medium border border-slate-200 transition cursor-pointer text-left"
 >
 {sample.slice(0, 45)}...
 </button>
 ))}
 </div>
 </div>

 <div className="pt-2 flex items-center justify-end gap-2">
 <button
 type="button"
 onClick={() => setAiModalOpen(false)}
 className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => handleGenerateAiDraft()}
 disabled={!aiPrompt.trim() || aiLoading}
 className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer"
 >
 {aiLoading ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 <span>Analyzing & Drafting with oBuy AI...</span>
 </>
 ) : (
 <>
 <Sparkles className="w-4 h-4 text-amber-300" />
 <span>Generate Listing Draft</span>
 </>
 )}
 </button>
 </div>
 </div>
 ) : (
 /* Draft Result Preview */
 <div className="space-y-4">
 <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
 <span className="font-bold flex items-center gap-1.5">
 <CheckCircle2 className="w-4 h-4 text-emerald-600" />
 Listing draft ready for review!
 </span>
 <button
 type="button"
 onClick={() => setAiDraftResult(null)}
 className="text-xs text-brand-700 font-bold hover:underline cursor-pointer"
 >
 Edit Prompt
 </button>
 </div>

 <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
 <div>
 <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
 Generated Title
 </span>
 <p className="font-black text-slate-900 text-sm">{aiDraftResult.title}</p>
 </div>

 <div className="flex flex-wrap gap-2 pt-1">
 <span className="px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 font-bold text-[11px] border border-brand-200">
 Category: {aiDraftResult.category}
 </span>
 <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px]">
 Condition: {aiDraftResult.condition}
 </span>
 </div>

 {/* Price Valuation Corridor (flat, spacious rows - zero cramped inner cards, handles ₦1,000,000+ cleanly) */}
 {aiDraftResult.priceCorridor && (
 <div className="pt-3 border-t border-slate-200 space-y-2">
 <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
 Nigerian Market Price Valuation (₦)
 </span>
 <div className="divide-y divide-slate-200/80 sm:divide-y-0 sm:grid sm:grid-cols-3 sm:gap-4">
 <div className="flex items-center justify-between sm:flex-col sm:items-start gap-2 py-2 sm:py-1">
 <span className="text-xs text-slate-500 font-medium">Fast Sale</span>
 <span className="text-sm sm:text-base font-bold text-slate-800 tabular-nums whitespace-nowrap">
 {formatPrice(aiDraftResult.priceCorridor.low)}
 </span>
 </div>
 <div className="flex items-center justify-between sm:flex-col sm:items-start gap-2 py-2 sm:py-1 sm:border-l sm:border-slate-200 sm:pl-4">
 <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700">
 <span>Recommended</span>
 </span>
 <span className="text-sm sm:text-base font-black text-brand-900 tabular-nums whitespace-nowrap">
 {formatPrice(aiDraftResult.priceCorridor.recommended)}
 </span>
 </div>
 <div className="flex items-center justify-between sm:flex-col sm:items-start gap-2 py-2 sm:py-1 sm:border-l sm:border-slate-200 sm:pl-4">
 <span className="text-xs text-slate-500 font-medium">Top Tier</span>
 <span className="text-sm sm:text-base font-bold text-slate-800 tabular-nums whitespace-nowrap">
 {formatPrice(aiDraftResult.priceCorridor.high)}
 </span>
 </div>
 </div>
 </div>
 )}

 <div>
 <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
 Generated Description
 </span>
 <p className="text-slate-700 whitespace-pre-line leading-relaxed">
 {aiDraftResult.description}
 </p>
 </div>

 {aiDraftResult.flawDescription && (
 <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
 <span className="font-bold block text-[11px]">Disclosed Wear / Flaws:</span>
 <span className="text-[11px]">{aiDraftResult.flawDescription}</span>
 </div>
 )}

 {aiDraftResult.preferredMeetupAdvice && (
 <div className="p-2.5 bg-brand-50 border border-brand-100 rounded-xl text-brand-900">
 <span className="font-bold block text-[11px]">Recommended Safe Meetup:</span>
 <span className="text-[11px]">{aiDraftResult.preferredMeetupAdvice}</span>
 </div>
 )}
 </div>

 <div className="flex items-center justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setAiDraftResult(null)}
 className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
 >
 Back to Prompt
 </button>
 <button
 type="button"
 onClick={handleApplyAiDraft}
 className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer"
 >
 <Check className="w-4 h-4" />
 <span>Apply to Listing Wizard</span>
 </button>
 </div>
 </div>
 )}
 </ResponsiveSheet>
 </div>
 );
}
