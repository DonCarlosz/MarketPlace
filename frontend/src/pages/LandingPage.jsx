import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMode } from '../context/ModeContext';
import { useAuth } from '../context/AuthContext';
import API, { resolveMediaUrl } from '../services/api';
import { formatPrice } from '../utils/format';
import { landingRouteCache } from '../utils/routeCache';
import ListingCard from '../components/ListingCard';
import PullToRefresh from '../components/PullToRefresh';
import {
 Store,
 RefreshCw,
 Sparkles,
 Wrench,
 Search,
 ArrowRight,
 ChevronLeft,
 ChevronRight,
 Flame,
 Play,
 Pause,
 X,
} from 'lucide-react';

const CATEGORY_TILES = [
 {
 name: 'Electronics & Tech',
 category: 'Electronics',
 mode: 'second-hand',
 image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80',
 tag: 'Laptops, TVs & Audio',
 },
 {
 name: 'Phones & Gadgets',
 category: 'Gadgets & Tech',
 mode: 'new',
 image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80',
 tag: 'Smartphones & Accessories',
 },
 {
 name: 'Vehicles & Parts',
 category: 'Vehicles',
 mode: 'second-hand',
 image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=500&q=80',
 tag: 'Bikes, Cars & Parts',
 },
 {
 name: 'Fashion & Wears',
 category: 'Fashion & Apparel',
 mode: 'new',
 image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=500&q=80',
 tag: 'Footwear & Fits',
 },
 {
 name: 'Home & Living',
 category: 'Furniture',
 mode: 'second-hand',
 image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=80',
 tag: 'Sofas, Tables & Decor',
 },
 {
 name: 'Barbers & Braids',
 category: 'Barbers & Hair',
 mode: 'service',
 image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=500&q=80',
 tag: 'Local Stylists',
 },
 {
 name: 'Handwork & Repairs',
 category: 'Home Repair & Handyman',
 mode: 'service',
 image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&q=80',
 tag: 'Mechanics, Solar & Techs',
 },
 {
 name: 'Tutors & Lessons',
 category: 'Tutors & Lessons',
 mode: 'service',
 image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=500&q=80',
 tag: 'Private Coaching',
 },
];

const POPULAR_SEARCHES = [
 { term: 'Phones', category: 'Electronics', mode: 'second-hand' },
 { term: 'Electronics', category: 'Electronics', mode: 'second-hand' },
 { term: 'Road Bikes', category: 'Vehicles', mode: 'second-hand' },
 { term: 'Furniture', category: 'Furniture', mode: 'second-hand' },
 { term: 'Barbers', category: 'Barbers & Hair', mode: 'service' },
 { term: 'Mechanics', category: 'Home Repair & Handyman', mode: 'service' },
];

const TRACK_SLIDES = [2, 0, 1, 2, 0];

export default function LandingPage() {
 const { setMode, setSearchQuery, setSelectedCategory } = useMode();
 const { openAuthModal, user } = useAuth();
 const navigate = useNavigate();

 const cachedFeatured = landingRouteCache.get('featured');
 const [localSearch, setLocalSearch] = useState('');
 const [selectedSearchCat, setSelectedSearchCat] = useState('All');
 const [featuredListings, setFeaturedListings] = useState(() => cachedFeatured || []);
 const [loading, setLoading] = useState(() => !cachedFeatured);
 const [activeFilter, setActiveFilter] = useState(null);

 // 1-direction infinite auto-switching Hero banner track
 const [trackIndex, setTrackIndex] = useState(1);
 const [enableTransition, setEnableTransition] = useState(true);
 const [isPlaying, setIsPlaying] = useState(true);

 const carouselRef = useRef(null);

 const nextSlide = () => {
 setEnableTransition(true);
 setTrackIndex((prev) => prev + 1);
 };

 const prevSlide = () => {
 setEnableTransition(true);
 setTrackIndex((prev) => prev - 1);
 };

 const handleTransitionEnd = () => {
 if (trackIndex >= 4) {
 setEnableTransition(false);
 setTrackIndex(1);
 } else if (trackIndex <= 0) {
 setEnableTransition(false);
 setTrackIndex(3);
 }
 };

 // Re-enable transition smoothly on next frame after track reset
 useEffect(() => {
 if (!enableTransition) {
 const raf = requestAnimationFrame(() => {
 requestAnimationFrame(() => {
 setEnableTransition(true);
 });
 });
 return () => cancelAnimationFrame(raf);
 }
 }, [enableTransition]);

 // Continuous forward auto-switch every 5.5 seconds (pauses when tab is hidden)
 useEffect(() => {
 if (!isPlaying) return;
 const interval = setInterval(() => {
 if (!document.hidden) {
 setEnableTransition(true);
 setTrackIndex((prev) => prev + 1);
 }
 }, 5500);
 return () => clearInterval(interval);
 }, [isPlaying]);

 const fetchListingsData = async (cat, term, silent = false) => {
 try {
 if (!silent) setLoading(true);
 const params = { limit: 12, sort: 'newest' };
 if (cat && cat !== 'All') params.category = cat;
 if (term) params.search = term;
 const res = await API.get('/listings', { params });
 if (res.data?.success) {
 const fresh = res.data.listings || [];
 if (!cat && !term) {
 landingRouteCache.set('featured', fresh);
 }
 setFeaturedListings(fresh);
 }
 } catch (err) {
 console.error('Failed to load listings:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 const unsub = landingRouteCache.subscribe(() => {
 const hydrated = landingRouteCache.get('featured');
 if (hydrated && hydrated.length > 0) {
 setFeaturedListings((prev) => (prev.length === 0 ? hydrated : prev));
 setLoading(false);
 }
 });
 fetchListingsData(null, null, Boolean(landingRouteCache.get('featured')));
 const onOnline = () => fetchListingsData(null, null, true);
 window.addEventListener('obuy:online', onOnline);
 return () => {
 unsub();
 window.removeEventListener('obuy:online', onOnline);
 };
 }, []);

 const scrollCarousel = (direction) => {
 if (carouselRef.current) {
 const scrollAmount = direction === 'left' ? -340 : 340;
 carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
 }
 };

 const handleSearchSubmit = (e) => {
 e.preventDefault();
 if (localSearch.trim()) {
 setSearchQuery(localSearch.trim());
 }
 if (selectedSearchCat && selectedSearchCat !== 'All') {
 setSelectedCategory(selectedSearchCat);
 }
 navigate('/market');
 };

 // When clicking popular chip: directly navigate to marketplace with search & category applied
 const handlePopularClick = (item) => {
 setSearchQuery(item.term);
 if (item.category) setSelectedCategory(item.category);
 if (item.mode) setMode(item.mode);
 navigate('/market');
 };

 // When clicking category tile: directly navigate to marketplace with mode & category applied
 const handleCategoryClick = (tile) => {
 setMode(tile.mode);
 setSelectedCategory(tile.category);
 setSearchQuery('');
 navigate('/market');
 };

 const handleClearFilter = async () => {
 setLocalSearch('');
 setSelectedSearchCat('All');
 setSelectedCategory('All');
 setSearchQuery('');
 setActiveFilter(null);
 await fetchListingsData();
 };

 const handleModeNavigate = (modeId) => {
 setMode(modeId);
 setSelectedCategory('All');
 navigate('/market');
 };

 const handlePostClick = () => {
 if (!user) {
 openAuthModal('login');
 } else {
 navigate('/create');
 }
 };

 const renderSlide = (slideId) => {
 if (slideId === 0) {
 return (
 <div className="w-full h-full relative bg-[#edf2f7] border-b border-slate-200 overflow-hidden">
 <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 h-full flex items-center justify-between gap-4 sm:gap-6 lg:gap-10">
 {/* Left Content */}
 <div className="flex-1 min-w-[260px] sm:min-w-[320px] max-w-xl space-y-2.5 sm:space-y-3 z-10">
 <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
 Great local finds. Direct deals.
 </h2>
 <p className="text-xs sm:text-sm md:text-base font-bold text-slate-700 leading-relaxed max-w-lg">
 Find pre-owned tech, vehicles, home furniture, and neighborhood handwork with zero wire transfer risks.
 </p>
 <div className="pt-1.5">
 <Link
 to="/market"
 className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition"
 >
 <span>Explore market</span>
 <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </div>

 {/* Right Content: 3 Clean Edge-to-Edge Category Showcases */}
 <div className="hidden sm:flex items-center gap-3 sm:gap-4 md:gap-5 shrink-0 py-2">
 {/* Item 1: Home and Garden */}
 <button
 type="button"
 onClick={() =>
 handleCategoryClick({
 name: 'Home & Living',
 category: 'Furniture',
 mode: 'second-hand',
 })
 }
 className="group flex flex-col items-center text-center cursor-pointer transition hover:-translate-y-0.5"
 >
 <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 bg-white rounded-2xl border border-slate-200 overflow-hidden">
 <img
 src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=80"
 alt="Home and Garden"
 className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
 />
 </div>
 <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-600 transition inline-flex items-center gap-0.5 whitespace-nowrap mt-2">
 Home & Living <ChevronRight className="w-3.5 h-3.5" />
 </span>
 </button>

 {/* Item 2: Fashion & Wears */}
 <button
 type="button"
 onClick={() =>
 handleCategoryClick({
 name: 'Fashion & Wears',
 category: 'Fashion & Apparel',
 mode: 'new',
 })
 }
 className="group flex flex-col items-center text-center cursor-pointer transition hover:-translate-y-0.5"
 >
 <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 bg-white rounded-2xl border border-slate-200 overflow-hidden">
 <img
 src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=500&q=80"
 alt="Fashion & Wears"
 className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
 />
 </div>
 <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-600 transition inline-flex items-center gap-0.5 whitespace-nowrap mt-2">
 Fashion & Wears <ChevronRight className="w-3.5 h-3.5" />
 </span>
 </button>

 {/* Item 3: Tech & Tools */}
 <button
 type="button"
 onClick={() =>
 handleCategoryClick({
 name: 'Electronics & Tech',
 category: 'Electronics',
 mode: 'second-hand',
 })
 }
 className="group flex flex-col items-center text-center cursor-pointer transition hover:-translate-y-0.5"
 >
 <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 bg-white rounded-2xl border border-slate-200 overflow-hidden">
 <img
 src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80"
 alt="Tech & Tools"
 className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
 />
 </div>
 <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-600 transition inline-flex items-center gap-0.5 whitespace-nowrap mt-2">
 Tech & Audio <ChevronRight className="w-3.5 h-3.5" />
 </span>
 </button>
 </div>
 </div>
 </div>
 );
 }

 if (slideId === 1) {
 return (
 <div className="w-full h-full relative overflow-hidden">
 <img
 src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1800&q=80"
 alt="Community Life and Meetups"
 className="absolute inset-0 w-full h-full object-cover"
 />
 <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />

 <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 h-full flex items-center">
 <div className="max-w-xl space-y-2.5 text-white">
 <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
 Get more with an oBuy account.
 </h2>
 <p className="text-xs sm:text-sm font-bold text-slate-100 leading-relaxed max-w-lg">
 Enjoy direct member messaging, instant deal notifications, and zero listing fees across your neighborhood.
 </p>
 <div className="pt-1 flex items-center gap-3">
 <button
 type="button"
 onClick={handlePostClick}
 className="px-5 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer"
 >
 {user ? 'Post a Listing' : 'Sign in to Start'}
 </button>
 <Link
 to="/market"
 className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm border border-white/25 transition"
 >
 Explore market
 </Link>
 </div>
 </div>
 </div>
 </div>
 );
 }

 if (slideId === 2) {
 return (
 <div className="w-full h-full relative overflow-hidden bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 text-white border-b border-brand-900/40">
 <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 h-full flex items-center justify-between gap-6 lg:gap-10">
 {/* Left Content */}
 <div className="flex-1 max-w-lg space-y-2.5">
 <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
 Neighborhood handwork on demand.
 </h2>
 <p className="text-xs sm:text-sm font-bold text-brand-100 leading-relaxed max-w-lg">
 Book trusted local barbers, braiders, mechanics, cleaners, and private tutors directly in your town.
 </p>
 <div className="pt-1">
 <button
 type="button"
 onClick={() => handleModeNavigate('service')}
 className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm transition"
 >
 <span>Find skilled pros</span>
 <ArrowRight className="w-4 h-4" />
 </button>
 </div>
 </div>

 {/* Right Content: Clickable Service Category Cards */}
 <div className="hidden sm:flex items-center gap-4 shrink-0 py-1 pr-2 sm:pr-4">
 {/* Barber Card */}
 <button
 type="button"
 onClick={() =>
 handleCategoryClick({
 name: 'Barbers & Braids',
 category: 'Barbers & Hair',
 mode: 'service',
 })
 }
 className="w-36 sm:w-42 md:w-44 h-40 sm:h-44 bg-white text-slate-900 rounded-2xl overflow-hidden border border-white/20 hover:-translate-y-0.5 transition flex flex-col text-left cursor-pointer"
 >
 <div className="w-full h-22 sm:h-24 overflow-hidden shrink-0">
 <img
 src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80"
 alt="Barber"
 decoding="async"
 className="w-full h-full object-cover"
 />
 </div>
 <div className="p-2.5">
 <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">Master Barber</div>
 <div className="text-[11px] text-purple-600 font-bold">Fixed Sessions</div>
 <div className="text-[10px] text-slate-500 truncate mt-0.5">Fades, Beard & Styling</div>
 </div>
 </button>

 {/* Mechanic Card */}
 <button
 type="button"
 onClick={() =>
 handleCategoryClick({
 name: 'Auto Detailing & Mechanics',
 category: 'Auto Detailing & Mechanics',
 mode: 'service',
 })
 }
 className="w-36 sm:w-42 md:w-44 h-40 sm:h-44 bg-white text-slate-900 rounded-2xl overflow-hidden border border-white/20 hover:-translate-y-0.5 transition flex flex-col text-left cursor-pointer"
 >
 <div className="w-full h-22 sm:h-24 overflow-hidden shrink-0">
 <img
 src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80"
 alt="Mechanic"
 decoding="async"
 className="w-full h-full object-cover"
 />
 </div>
 <div className="p-2.5">
 <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">Auto Mechanics</div>
 <div className="text-[11px] text-emerald-600 font-bold">Starting-At</div>
 <div className="text-[10px] text-slate-500 truncate mt-0.5">Engine, Brakes & Tune-up</div>
 </div>
 </button>
 </div>
 </div>
 </div>
 );
 }

 return null;
 };


 return (
 <PullToRefresh
 onRefresh={() =>
 fetchListingsData(
 selectedSearchCat !== 'All' ? selectedSearchCat : undefined,
 localSearch || undefined,
 true
 )
 }
 >
 <div className="min-h-screen bg-white flex flex-col w-full max-w-full overflow-x-clip">
 {/* 1. Top Search Section (Unified Clean Full-Width Bar) */}
 <section className="bg-slate-50 border-b border-slate-200/90 py-3.5 sm:py-5 px-4 sm:px-6 lg:px-8 w-full max-w-full">
 <div className="max-w-7xl mx-auto space-y-2.5">
 <form
 onSubmit={handleSearchSubmit}
 className="flex items-center gap-2 max-w-3xl mx-auto bg-white p-1 sm:p-1.5 rounded-full border border-slate-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition"
 >
 <div className="flex items-center gap-2 flex-1 min-w-0 pl-3">
 <Search className="w-4 h-4 text-slate-400 shrink-0" />
 <input
 type="text"
 value={localSearch}
 onChange={(e) => setLocalSearch(e.target.value)}
 placeholder="Search phones, laptops, bikes, barbers, tutors..."
 className="w-full min-w-0 bg-transparent border-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none py-1.5"
 />
 {localSearch && (
 <button
 type="button"
 onClick={handleClearFilter}
 aria-label="Clear search"
 className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer shrink-0"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 )}
 </div>

 <button
 type="submit"
 className="px-5 sm:px-6 py-1.5 sm:py-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm transition shrink-0 cursor-pointer"
 >
 Search
 </button>
 </form>

 {/* Quick Popular Search Pills */}
 <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 text-xs text-slate-600 flex-wrap">
 <span className="font-semibold text-slate-400 text-[11px]">Popular:</span>
 {POPULAR_SEARCHES.map((item) => {
 const isSelected = activeFilter === item.term || localSearch === item.term;
 return (
 <button
 key={item.term}
 type="button"
 onClick={() => handlePopularClick(item)}
 className={`transition px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs cursor-pointer ${
 isSelected
 ? 'bg-brand-600 text-white font-bold'
 : 'hover:text-brand-600 hover:bg-slate-200/60 font-medium'
 }`}
 >
 {item.term}
 </button>
 );
 })}
 </div>
 </div>
 </section>

 {/* 2. Full-Bleed Auto-Switching Hero Banner (Tight Mobile Height, 1-Direction Infinite Scroll) */}
 <section className="w-full relative overflow-hidden bg-slate-900 border-b border-slate-200">
 <div className="relative w-full h-[248px] sm:h-[310px] md:h-[330px] overflow-hidden">
 {/* Continuous Forward Sliding Track */}
 <div
 className="flex w-full h-full"
 style={{
 transform: `translateX(-${trackIndex * 100}%)`,
 transition: enableTransition
 ? 'transform 700ms cubic-bezier(0.25, 1, 0.5, 1)'
 : 'none',
 }}
 onTransitionEnd={handleTransitionEnd}
 >
 {TRACK_SLIDES.map((slideId, idx) => (
 <div key={idx} className="w-full h-full flex-shrink-0">
 {renderSlide(slideId)}
 </div>
 ))}
 </div>

 {/* Hero Controls Cluster (Bottom Right Chevrons & Play/Pause) */}
 <div className="absolute bottom-3 right-6 z-20 flex items-center gap-2 bg-slate-950/75 px-3 py-1.5 rounded-full text-white">
 {/* Slide indicator dots */}
 <div className="flex items-center gap-1.5 px-1">
 {[0, 1, 2].map((idx) => {
 const activeDot = (trackIndex - 1 + 3) % 3;
 return (
 <button
 key={idx}
 type="button"
 onClick={() => {
 setEnableTransition(true);
 setTrackIndex(idx + 1);
 }}
 aria-label={`Go to slide ${idx + 1}`}
 className={`h-2 rounded-full transition-all ${
 activeDot === idx ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/70 w-2'
 }`}
 />
 );
 })}
 </div>

 <span className="text-white/30 text-xs px-0.5">|</span>

 {/* Left Chevron */}
 <button
 type="button"
 onClick={prevSlide}
 aria-label="Previous slide"
 className="w-7 h-7 rounded-full bg-white/20 hover:bg-white text-white hover:text-slate-900 flex items-center justify-center transition active:scale-90"
 >
 <ChevronLeft className="w-4 h-4" />
 </button>

 {/* Right Chevron */}
 <button
 type="button"
 onClick={nextSlide}
 aria-label="Next slide"
 className="w-7 h-7 rounded-full bg-white/20 hover:bg-white text-white hover:text-slate-900 flex items-center justify-center transition active:scale-90"
 >
 <ChevronRight className="w-4 h-4" />
 </button>

 {/* Pause / Play */}
 <button
 type="button"
 onClick={() => setIsPlaying(!isPlaying)}
 aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
 className="w-7 h-7 rounded-full bg-white/20 hover:bg-white text-white hover:text-slate-900 flex items-center justify-center transition active:scale-90"
 >
 {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
 </button>
 </div>
 </div>
 </section>

 {/* 3. Editorial Full-Bleed Category Grid: "Explore by Category" (8 balanced tiles, zero padded inner frames) */}
 <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-7 sm:pt-9 overflow-hidden">
 <div className="flex items-end justify-between mb-3.5 sm:mb-4">
 <div>
 <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
 Explore by Category
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Jump straight into popular items and local services.
 </p>
 </div>
 <Link
 to="/market"
 className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1 shrink-0"
 >
 <span>See all</span>
 <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>

 {/* Crisp 4x2 Full-Bleed Photo Tiles (2x4 on mobile, 4x2 on tablet/desktop - zero orphan slots) */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
 {CATEGORY_TILES.map((tile) => {
 const isSelected = activeFilter === tile.name || (selectedSearchCat === tile.category && !activeFilter);
 return (
 <button
 key={tile.name}
 type="button"
 onClick={() => handleCategoryClick(tile)}
 className={`group relative aspect-[16/10] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 border text-left cursor-pointer transition-colors ${
 isSelected
 ? 'border-brand-500 ring-2 ring-brand-200'
 : 'border-slate-200 hover:border-brand-400'
 }`}
 >
 <img
 src={tile.image}
 alt={tile.name}
 className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
 loading="lazy"
 decoding="async"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
 <div className="relative z-10 h-full flex flex-col justify-end p-3 sm:p-3.5">
 <span className="font-extrabold text-xs sm:text-sm text-white leading-tight line-clamp-1">
 {tile.name}
 </span>
 <span className="text-[10px] sm:text-[11px] text-slate-200/90 font-medium line-clamp-1 mt-0.5">
 {tile.tag}
 </span>
 </div>
 </button>
 );
 })}
 </div>
 </section>

 {/* 4. Horizontal Scrollable Deals Carousel: "Trending Deals Near You" */}
 <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-8 sm:pt-10 overflow-hidden">
 <div className="flex items-end justify-between mb-3.5 sm:mb-4 flex-wrap gap-2">
 <div>
 <div className="inline-flex items-center gap-1.5 flex-wrap">
 <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 mb-1">
 <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
 <span>Today's Highlights</span>
 </div>
 {activeFilter && (
 <div className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200 mb-1">
 <span>Filtered: {activeFilter}</span>
 <button
 type="button"
 onClick={handleClearFilter}
 className="hover:text-brand-900 ml-1 font-extrabold cursor-pointer"
 >
 ×
 </button>
 </div>
 )}
 </div>
 <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
 Trending Deals Near You
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Active items and services ready for direct inspection and meetup.
 </p>
 </div>
 <Link
 to="/market"
 className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1 shrink-0"
 >
 <span>View market</span>
 <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>

 {/* Scrollable Container (Arrows desktop-only so mobile badges are never overlapped) */}
 {loading ? (
 <div className="flex gap-3 sm:gap-4 overflow-x-hidden py-1">
 {[1, 2, 3, 4, 5].map((n) => (
 <div
 key={n}
 className="w-[170px] sm:w-[210px] md:w-[220px] h-[268px] sm:h-[304px] shrink-0 bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden flex flex-col"
 >
 <div className="w-full h-[154px] sm:h-[182px] obuy-shimmer shrink-0" />
 <div className="p-2.5 sm:p-3 space-y-2 flex-1">
 <div className="h-4 obuy-shimmer rounded w-1/2" />
 <div className="h-3.5 obuy-shimmer rounded w-11/12" />
 <div className="h-3 obuy-shimmer rounded w-2/3" />
 </div>
 </div>
 ))}
 </div>
 ) : featuredListings.length === 0 ? (
 <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center">
 <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
 <p className="text-sm font-semibold text-slate-700">No listings posted yet</p>
 <p className="text-xs text-slate-400 mt-1">Be the first to list an item or service in your area!</p>
 </div>
 ) : (
 <div className="relative group">
 {/* Left Chevron (Desktop sm+ only so mobile Card 1 badges stay 100% clear) */}
 <button
 type="button"
 onClick={() => scrollCarousel('left')}
 aria-label="Scroll left"
 className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white hover:bg-slate-50 text-slate-800 items-center justify-center border border-slate-200 hover:border-slate-300 transition active:scale-95 cursor-pointer"
 >
 <ChevronLeft className="w-5 h-5" />
 </button>

 {/* Right Chevron (Desktop sm+ only) */}
 <button
 type="button"
 onClick={() => scrollCarousel('right')}
 aria-label="Scroll right"
 className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white hover:bg-slate-50 text-slate-800 items-center justify-center border border-slate-200 hover:border-slate-300 transition active:scale-95 cursor-pointer"
 >
 <ChevronRight className="w-5 h-5" />
 </button>

 <div
 ref={carouselRef}
 className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-3 pt-1 no-scrollbar"
 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
 >
 {featuredListings.map((item) => (
 <div key={item._id} className="w-[170px] sm:w-[210px] md:w-[220px] shrink-0">
 <ListingCard listing={item} />
 </div>
 ))}
 </div>
 </div>
 )}
 </section>

 {/* 5. Clean Full-Bleed Showcase & Seller CTA Band (Flat aligned 3-card strip, zero tilted overflow) */}
 <section className="w-full bg-slate-50 border-y border-slate-200 mt-8 sm:mt-10 py-7 sm:py-9 overflow-hidden">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
 <div className="space-y-3 max-w-xl">
 <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
 Buy local. Sell free with zero commission.
 </h2>

 <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
 Post unused items or local services in under 2 minutes, chat directly with verified neighbors, and pay only after physical inspection.
 </p>

 <div className="pt-1 flex items-center gap-2.5 flex-wrap">
 <button
 type="button"
 onClick={handlePostClick}
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer"
 >
 <span>Post a Listing</span>
 <ArrowRight className="w-4 h-4" />
 </button>
 <Link
 to="/market"
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold text-xs sm:text-sm transition active:scale-95"
 >
 <span>Explore Market</span>
 </Link>
 </div>
 </div>

 {/* Clean Aligned 3-Card Live Listing Strip (Zero clipping on 390px mobile) */}
 <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 w-full lg:w-[460px] shrink-0">
 {(featuredListings.length >= 3 ? featuredListings.slice(0, 3) : CATEGORY_TILES.slice(0, 3)).map((entry) => {
 const isLiveListing = Boolean(entry._id);
 const imgUrl = isLiveListing
 ? resolveMediaUrl(entry.images?.[0]?.url)
 : entry.image;

 if (isLiveListing) {
 return (
 <Link
 key={entry._id}
 to={`/listing/${entry._id}`}
 className="group bg-white rounded-xl sm:rounded-2xl border border-slate-200 hover:border-brand-400 transition overflow-hidden block"
 >
 <div className="w-full aspect-square bg-slate-100 overflow-hidden">
 <img
 src={imgUrl}
 alt={entry.title}
 loading="lazy"
 decoding="async"
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 </div>
 <div className="p-2">
 <div className="text-[10px] sm:text-[11px] font-bold text-slate-900 truncate">{entry.title}</div>
 <div className="text-[10px] sm:text-[11px] font-extrabold text-brand-600 truncate">
 {formatPrice(entry.price, entry.priceType)}
 </div>
 </div>
 </Link>
 );
 }

 return (
 <button
 key={entry.name}
 type="button"
 onClick={() => handleCategoryClick(entry)}
 className="group bg-white rounded-xl sm:rounded-2xl border border-slate-200 hover:border-brand-400 transition overflow-hidden text-left cursor-pointer"
 >
 <div className="w-full aspect-square bg-slate-100 overflow-hidden">
 <img
 src={imgUrl}
 alt={entry.name}
 loading="lazy"
 decoding="async"
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 </div>
 <div className="p-2">
 <div className="text-[10px] sm:text-[11px] font-bold text-slate-900 truncate">{entry.name}</div>
 <div className="text-[10px] font-extrabold text-brand-600 truncate">{entry.tag}</div>
 </div>
 </button>
 );
 })}
 </div>
 </div>
 </section>

 {/* 6. The 3 Core Trading Modes: Interactive Pillars */}
 <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-10 sm:pt-12 overflow-hidden">
 <div className="text-center space-y-1.5 mb-6">
 <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
 Three Ways to Trade in Your Neighborhood
 </h2>
 <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
 From pre-loved graded bargains to factory-sealed products and on-demand local handwork.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 {/* Pillar 1: Second-hand */}
 <div
 onClick={() => handleModeNavigate('second-hand')}
 className="group relative bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-brand-400 transition duration-200 cursor-pointer flex flex-col justify-between"
 >
 <div className="space-y-3">
 <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition ">
 <RefreshCw className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
 Pre-Loved & Graded
 </span>
 <h3 className="text-base font-bold text-slate-900 mt-0.5">Second-Hand Goods</h3>
 <p className="text-xs text-slate-600 mt-1 leading-relaxed">
 Declutter or score huge bargains on gently-used electronics, road bikes, furniture,
 clothing, and tools directly from verified community members.
 </p>
 </div>

 <div className="flex flex-wrap gap-1.5 pt-1">
 {['Fair', 'Good', 'Like-New'].map((cond) => (
 <span
 key={cond}
 className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
 >
 {cond}
 </span>
 ))}
 </div>
 </div>

 <div className="mt-5 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-brand-600 group-hover:text-brand-700">
 <span>Browse Second-hand</span>
 <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
 </div>
 </div>

 {/* Pillar 2: New Items */}
 <div
 onClick={() => handleModeNavigate('new')}
 className="group relative bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-400 transition duration-200 cursor-pointer flex flex-col justify-between"
 >
 <div className="space-y-3">
 <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition ">
 <Sparkles className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
 Factory-Sealed & Crafts
 </span>
 <h3 className="text-base font-bold text-slate-900 mt-0.5">Brand-New Items</h3>
 <p className="text-xs text-slate-600 mt-1 leading-relaxed">
 Support local merchants, boutique creators, and tech retailers. Find brand-new,
 boxed gadgets, organic beauty products, home decor, and fashion.
 </p>
 </div>

 <div className="flex flex-wrap gap-1.5 pt-1">
 {['Direct Sellers', 'Local Artisans', 'Sealed Tech'].map((tag) => (
 <span
 key={tag}
 className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
 >
 {tag}
 </span>
 ))}
 </div>
 </div>

 <div className="mt-5 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
 <span>Shop Brand-New</span>
 <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
 </div>
 </div>

 {/* Pillar 3: Local Services */}
 <div
 onClick={() => handleModeNavigate('service')}
 className="group relative bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-purple-400 transition duration-200 cursor-pointer flex flex-col justify-between"
 >
 <div className="space-y-3">
 <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition ">
 <Wrench className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
 Local Handwork
 </span>
 <h3 className="text-base font-bold text-slate-900 mt-0.5">Local Handwork & Services</h3>
 <p className="text-xs text-slate-600 mt-1 leading-relaxed">
 Book skilled neighborhood professionals on demand. Master barbers, braiders,
 auto mechanics, deep cleaners, and private math tutors.
 </p>
 </div>

 <div className="flex flex-wrap gap-1.5 pt-1">
 {['Fixed Sessions', 'Starting-At', 'No Agency Cuts'].map((tag) => (
 <span
 key={tag}
 className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
 >
 {tag}
 </span>
 ))}
 </div>
 </div>

 <div className="mt-5 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-purple-600 group-hover:text-purple-700">
 <span>Find Skilled Services</span>
 <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
 </div>
 </div>
 </div>
 </section>

 {/* 7. Full-Bleed Safe Local Meetup Blueprint Band (removed redundant duplicate stock promo banner) */}
 <section className="w-full bg-slate-50 border-t border-slate-200 mt-8 sm:mt-10 py-8 sm:py-10 overflow-hidden">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
 <div className="text-center space-y-1.5 max-w-lg mx-auto">
 <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
 How Safe Community Commerce Works
 </h2>
 <p className="text-xs text-slate-500">
 Inspect in person before you pay. Direct peer-to-peer deals with zero middleman deductions.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-2">
 <div className="w-7 h-7 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center text-xs ">
 1
 </div>
 <h3 className="text-sm font-bold text-slate-900">Explore Nearby by Radius</h3>
 <p className="text-xs text-slate-600 leading-relaxed">
 Filter deals in your exact town (Uromi, Abraka, Ekpoma, Benin, Warri, Lagos) with calculated distance tags.
 </p>
 </div>

 <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-2">
 <div className="w-7 h-7 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center text-xs ">
 2
 </div>
 <h3 className="text-sm font-bold text-slate-900">Direct In-App Chat</h3>
 <p className="text-xs text-slate-600 leading-relaxed">
 Send a message request to the seller or service provider. Agree on terms and choose a safe, public meetup location.
 </p>
 </div>

 <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-2">
 <div className="w-7 h-7 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center text-xs ">
 3
 </div>
 <h3 className="text-sm font-bold text-slate-900">Inspect First, Pay Directly</h3>
 <p className="text-xs text-slate-600 leading-relaxed">
 Meet in person. Test electronics and inspect condition. Pay directly via cash or instant transfer with zero platform deductions.
 </p>
 </div>
 </div>
 </div>
 </section>
 </div>
 </PullToRefresh>
 );
}
