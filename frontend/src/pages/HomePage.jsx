import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMode } from '../context/ModeContext';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { getSocket } from '../services/socket';
import { resolveCityCoordinates, calculateDistanceKm } from '../utils/geo';
import { marketListingsCache } from '../utils/routeCache';
import ListingCard from '../components/ListingCard';
import FilterSidebar from '../components/FilterSidebar';
import SafetyBanner from '../components/SafetyBanner';
import PullToRefresh from '../components/PullToRefresh';
import ResponsiveSheet from '../components/ResponsiveSheet';
import {
 Search,
 SlidersHorizontal,
 RefreshCw,
 Sparkles,
 Wrench,
 AlertCircle,
 LayoutGrid,
 List,
 X,
} from 'lucide-react';

const CATEGORIES_BY_MODE = {
 'second-hand': [
 'All',
 'Electronics',
 'Furniture',
 'Vehicles',
 'Clothing & Shoes',
 'Home & Garden',
 'Sports & Outdoors',
 'Collectibles',
 'Tools',
 'Books & Games',
 ],
 new: [
 'All',
 'Electronics',
 'Fashion & Apparel',
 'Home Decor',
 'Beauty & Personal Care',
 'Fitness & Gear',
 'Gadgets & Tech',
 'Handmade & Crafts',
 'Groceries & Snacks',
 ],
 service: [
 'All',
 'Barbers & Hair',
 'Nail & Lash Techs',
 'Photography & Video',
 'Home Repair & Handyman',
 'Tutors & Lessons',
 'House Cleaning',
 'Auto Detailing & Mechanics',
 'Events & Catering',
 'Personal Trainers',
 ],
};

// Persisted IndexedDB-backed SWR cache for instant return & offline viewing
const listingsCache = marketListingsCache;
const setBoundedCache = (key, value) => {
 listingsCache.set(key, value);
};
let lastMarketScrollY = 0;

export default function HomePage() {
 const { user } = useAuth();
 const [searchParams, setSearchParams] = useSearchParams();
 const {
 mode,
 setMode,
 searchQuery,
 setSearchQuery,
 selectedCategory,
 setSelectedCategory,
 radiusKm,
 setRadiusKm,
 userLocation,
 setUserLocation,
 } = useMode();

 const [sortBy, setSortBy] = useState('newest');
 const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });
 const [conditionFilter, setConditionFilter] = useState('all');

 // Marketplace View Mode: 'grid' vs 'list'
 const [viewMode, setViewMode] = useState('grid');
 // Mobile Filter Drawer State
 const [mobileFilterDrawerOpen, setMobileFilterDrawerOpen] = useState(false);

 // Sync URL query params (?mode=, ?category=, ?search=) when navigated via deep link or Footer
 useEffect(() => {
 const urlMode = searchParams.get('mode');
 const urlCategory = searchParams.get('category');
 const urlSearch = searchParams.get('search');
 let consumed = false;

 if (urlMode && ['second-hand', 'new', 'service'].includes(urlMode)) {
 setMode(urlMode);
 if (!urlCategory) setSelectedCategory('All');
 consumed = true;
 }
 if (urlCategory) {
 setSelectedCategory(urlCategory);
 consumed = true;
 }
 if (urlSearch !== null) {
 setSearchQuery(urlSearch);
 consumed = true;
 }
 if (consumed) {
 setSearchParams({}, { replace: true });
 }
 }, [searchParams, setMode, setSelectedCategory, setSearchQuery, setSearchParams]);

 const socketRef = useRef(null);
 const categories = CATEGORIES_BY_MODE[mode] || CATEGORIES_BY_MODE['second-hand'];

 // Current active city for proximity
 const activeCity = userLocation.city || user?.location?.city || 'All Locations';

 // Cache key generator
 const getCacheKey = () => {
 return JSON.stringify({
 mode,
 category: selectedCategory,
 search: searchQuery.trim().toLowerCase(),
 minPrice: priceFilter.min,
 maxPrice: priceFilter.max,
 condition: conditionFilter,
 radiusKm,
 sort: sortBy,
 city: activeCity,
 userId: user?._id || user?.id || 'guest',
 });
 };

 const initialKey = getCacheKey();
 const cachedInitial = listingsCache.get(initialKey);

 // Synchronously initialize state so cached results render instantly with zero delay
 const [listings, setListings] = useState(() => cachedInitial || []);
 const [loading, setLoading] = useState(() => !cachedInitial);
 const [error, setError] = useState(null);

 // Scroll restoration on return to /market (rAF throttled for 60fps mobile scrolling)
 useEffect(() => {
 if (lastMarketScrollY > 0) {
 window.scrollTo(0, lastMarketScrollY);
 }
 let rafId = null;
 const handleScroll = () => {
 if (rafId !== null) return;
 rafId = requestAnimationFrame(() => {
 lastMarketScrollY = window.scrollY;
 rafId = null;
 });
 };
 window.addEventListener('scroll', handleScroll, { passive: true });
 return () => {
 window.removeEventListener('scroll', handleScroll);
 if (rafId !== null) cancelAnimationFrame(rafId);
 };
 }, []);

 const fetchListings = async (silent = false) => {
 const cacheKey = getCacheKey();
 const cachedData = listingsCache.get(cacheKey);

 if (cachedData && cachedData.length >= 0) {
 setListings(cachedData);
 setLoading(false);
 } else if (!silent) {
 setLoading(true);
 }

 setError(null);

 try {
 const params = {
 mode,
 sort: sortBy,
 };

 if (searchQuery.trim()) params.search = searchQuery.trim();
 if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
 if (priceFilter.min) params.minPrice = priceFilter.min;
 if (priceFilter.max) params.maxPrice = priceFilter.max;
 if (conditionFilter !== 'all') params.condition = conditionFilter;

 // Pass user city to backend for proximity search & distance calculation
 if (activeCity && activeCity !== 'All Locations') {
 params.userCity = activeCity;
 const resolved = resolveCityCoordinates(activeCity);
 params.lng = resolved[0];
 params.lat = resolved[1];
 }

 if (radiusKm && radiusKm !== 'all') {
 params.radiusKm = Number(radiusKm);
 }

 const res = await API.get('/listings', { params });
 if (res.data?.success) {
 let freshListings = res.data.listings || [];

 // Compute distance in kilometers client-side for immediate display badge
 const currentCoords =
 userLocation.coordinates ||
 user?.location?.coordinates ||
 (activeCity !== 'All Locations' ? resolveCityCoordinates(activeCity) : null);

 if (currentCoords && currentCoords.length === 2 && currentCoords[0] !== 0) {
 freshListings = freshListings.map((item) => {
 if (item.location?.coordinates?.length === 2 && item.location.coordinates[0] !== 0) {
 // GeoJSON coordinates are [longitude, latitude]
 const d = calculateDistanceKm(
 currentCoords[0],
 currentCoords[1],
 item.location.coordinates[0],
 item.location.coordinates[1]
 );
 return { ...item, distanceKm: d };
 }
 return item;
 });

 if (radiusKm && radiusKm !== 'all') {
 freshListings = freshListings.filter(
 (item) => item.distanceKm === null || item.distanceKm <= Number(radiusKm)
 );
 }
 }

 setBoundedCache(cacheKey, freshListings);
 setListings(freshListings);
 }
 } catch (err) {
 console.error('Failed to fetch listings:', err);
 if (!cachedData) {
 setError('Could not load listings. Please check if backend is running.');
 }
 } finally {
 setLoading(false);
 }
 };

 // Hydrate from IndexedDB if offline/cold boot, and re-sync automatically when back online
 useEffect(() => {
 const key = getCacheKey();
 const unsub = listingsCache.subscribe(() => {
 const hydrated = listingsCache.get(key);
 if (hydrated && hydrated.length > 0) {
 setListings((prev) => (prev.length === 0 ? hydrated : prev));
 setLoading(false);
 }
 });
 const onOnline = () => fetchListings(true);
 window.addEventListener('obuy:online', onOnline);
 return () => {
 unsub();
 window.removeEventListener('obuy:online', onOnline);
 };
 }, [mode, selectedCategory, searchQuery, sortBy, activeCity]);

 // Real-time background sync via Socket.io
 useEffect(() => {
 socketRef.current = getSocket();

 const handleListingCreated = (newListing) => {
 if (!newListing) return;
 if (user) {
 const currentUserId = (user._id || user.id)?.toString();
 const sellerId = (newListing.seller?._id || newListing.seller?.id || newListing.seller)?.toString();
 if (currentUserId && sellerId && currentUserId === sellerId) return;
 }
 if (newListing.mode !== mode && mode !== 'all') return;

 setListings((prev) => {
 if (prev.some((item) => item._id === newListing._id)) return prev;
 const updated = [newListing, ...prev];
 setBoundedCache(getCacheKey(), updated);
 return updated;
 });
 };

 const handleListingStatusChanged = ({ id, status }) => {
 setListings((prev) => {
 let updated;
 if (status === 'sold' || status === 'completed' || status === 'inactive') {
 updated = prev.filter((item) => item._id !== id);
 } else {
 updated = prev.map((item) => (item._id === id ? { ...item, status } : item));
 }
 setBoundedCache(getCacheKey(), updated);
 return updated;
 });
 };

 const handleListingDeleted = ({ id }) => {
 setListings((prev) => {
 const updated = prev.filter((item) => item._id !== id);
 setBoundedCache(getCacheKey(), updated);
 return updated;
 });
 };

 socketRef.current.on('listing_created', handleListingCreated);
 socketRef.current.on('listing_status_changed', handleListingStatusChanged);
 socketRef.current.on('listing_deleted', handleListingDeleted);

 return () => {
 if (socketRef.current) {
 socketRef.current.off('listing_created', handleListingCreated);
 socketRef.current.off('listing_status_changed', handleListingStatusChanged);
 socketRef.current.off('listing_deleted', handleListingDeleted);
 }
 };
 }, [mode, user]);

 // Fetch listings on filter or search change
 useEffect(() => {
 const cacheKey = getCacheKey();
 const cachedData = listingsCache.get(cacheKey);

 if (cachedData) {
 setListings(cachedData);
 setLoading(false);
 }

 const timer = setTimeout(() => {
 fetchListings(!!cachedData);
 }, 180);

 return () => clearTimeout(timer);
 }, [mode, selectedCategory, searchQuery, sortBy, radiusKm, conditionFilter, priceFilter, activeCity, user]);

 const handleSearchSubmit = (e) => {
 e.preventDefault();
 fetchListings(false);
 };

 const handleCityChange = (newCity) => {
 const coords = newCity === 'All Locations' ? null : resolveCityCoordinates(newCity);
 setUserLocation({
 city: newCity,
 coordinates: coords,
 });
 };

 const handleResetAll = () => {
 setSearchQuery('');
 setSelectedCategory('All');
 setRadiusKm('all');
 handleCityChange('All Locations');
 setPriceFilter({ min: '', max: '' });
 setConditionFilter('all');
 };

 // Filter listings where current logged in user is NOT the seller
 const currentUserId = (user?._id || user?.id)?.toString();
 const displayListings = currentUserId
 ? listings.filter((l) => {
 const sellerId = (l.seller?._id || l.seller?.id || l.seller)?.toString();
 return sellerId !== currentUserId;
 })
 : listings;

 const hasActiveFilters =
 (selectedCategory && selectedCategory !== 'All') ||
 searchQuery ||
 priceFilter.min ||
 priceFilter.max ||
 conditionFilter !== 'all' ||
 radiusKm !== 'all' ||
 activeCity !== 'All Locations';

 return (
 <PullToRefresh onRefresh={() => fetchListings(true)}>
 <div className="min-h-screen bg-slate-50 flex flex-col w-full max-w-full overflow-x-clip">
 <SafetyBanner />

 {/* Hero & Search Header */}
 <section className="bg-white border-b border-slate-200 py-6 sm:py-7 px-4 sm:px-6">
 <div className="max-w-4xl mx-auto text-center space-y-4">
 {/* Mode Switcher Tabs (Equal 3-column segmented layout with zero wrapping) */}
 <div className="w-full max-w-sm sm:max-w-md mx-auto p-1 bg-slate-100/90 rounded-2xl sm:rounded-full border border-slate-200/90 grid grid-cols-3 gap-1">
 <button
 type="button"
 onClick={() => {
 setMode('second-hand');
 setSelectedCategory('All');
 }}
 className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer ${
 mode === 'second-hand'
 ? 'bg-brand-600 text-white '
 : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
 }`}
 >
 <RefreshCw className="w-3.5 h-3.5 shrink-0" />
 <span>Second-Hand</span>
 </button>
 <button
 type="button"
 onClick={() => {
 setMode('new');
 setSelectedCategory('All');
 }}
 className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer ${
 mode === 'new'
 ? 'bg-emerald-600 text-white '
 : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
 }`}
 >
 <Sparkles className="w-3.5 h-3.5 shrink-0" />
 <span>Brand-New</span>
 </button>
 <button
 type="button"
 onClick={() => {
 setMode('service');
 setSelectedCategory('All');
 }}
 className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer ${
 mode === 'service'
 ? 'bg-purple-600 text-white '
 : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
 }`}
 >
 <Wrench className="w-3.5 h-3.5 shrink-0" />
 <span>Services</span>
 </button>
 </div>

 <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
 Discover {mode === 'service' ? 'trusted local services' : 'great items'} in your community.
 </h1>

 {/* Integrated Search Bar with Category Dropdown */}
 <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto pt-1">
 <div className="flex items-center bg-white rounded-full border border-slate-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition p-1 sm:p-1.5">
 <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 ml-3 mr-2 shrink-0" />
 <input
 type="text"
 placeholder={`Search ${
 mode === 'service'
 ? 'services (e.g., barber, photographer, tutor)...'
 : 'items (e.g., bike, generator, phone)...'
 }`}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-transparent border-none focus:outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 py-1"
 />
 {searchQuery && (
 <button
 type="button"
 onClick={() => {
 setSearchQuery('');
 fetchListings(false);
 }}
 className="p-1 text-slate-400 hover:text-slate-600 mr-1 cursor-pointer"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 {/* Category Dropdown inside Search Input */}
 <div className="flex items-center border-l border-slate-200 px-2 shrink-0">
 <select
 value={selectedCategory}
 onChange={(e) => setSelectedCategory(e.target.value)}
 className="text-xs font-semibold text-slate-600 bg-transparent focus:outline-none cursor-pointer pr-1"
 aria-label="Filter by category"
 >
 {categories.map((cat) => (
 <option key={cat} value={cat}>
 {cat === 'All' ? 'All Categories' : cat}
 </option>
 ))}
 </select>
 </div>
 <button
 type="submit"
 className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm rounded-full transition shrink-0 cursor-pointer"
 >
 Search
 </button>
 </div>
 </form>
 </div>
 </section>

 {/* Main Faceted 2-Column Marketplace Layout */}
 <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-grow w-full">
 <div className="flex gap-8 items-start">
 {/* Left Faceted Filter Sidebar (Desktop lg+) */}
 <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)]">
 <FilterSidebar
 categories={categories}
 selectedCategory={selectedCategory}
 onSelectCategory={(cat) => setSelectedCategory(cat)}
 mode={mode}
 priceFilter={priceFilter}
 onPriceChange={(newPrice) => setPriceFilter(newPrice)}
 conditionFilter={conditionFilter}
 onConditionChange={(c) => setConditionFilter(c)}
 activeCity={activeCity}
 onCityChange={(city) => handleCityChange(city)}
 radiusKm={radiusKm}
 onRadiusChange={(r) => setRadiusKm(r)}
 onResetAll={handleResetAll}
 />
 </aside>

 {/* Right Results Column */}
 <div className="flex-1 min-w-0">
 {/* Top Toolbar: Results count, Mobile Filter trigger, Sort Dropdown & Grid/List View Toggles */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-200">
 <div>
 <h2 className="text-lg sm:text-xl font-black text-slate-900 capitalize">
 {selectedCategory && selectedCategory !== 'All' ? selectedCategory : 'Available Listings'}
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 {displayListings.length} {displayListings.length === 1 ? 'result' : 'results'}
 {activeCity !== 'All Locations' ? ` near ${activeCity}` : ' in community'}
 </p>
 </div>

 <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
 {/* Mobile Filter Trigger Button (lg:hidden) */}
 <button
 type="button"
 onClick={() => setMobileFilterDrawerOpen(true)}
 className={`lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
 hasActiveFilters
 ? 'border-brand-500 bg-brand-50 text-brand-700'
 : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
 }`}
 >
 <SlidersHorizontal className="w-3.5 h-3.5" />
 <span>Filters</span>
 {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-600" />}
 </button>

 {/* Sort Dropdown */}
 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value)}
 className="bg-white border border-slate-300 text-xs font-semibold rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none cursor-pointer"
 >
 <option value="newest">Sort: Newest</option>
 <option value="price-low">Price: Low to High</option>
 <option value="price-high">Price: High to Low</option>
 <option value="popular">Most Viewed</option>
 </select>

 {/* View Mode Toggles: Grid vs List */}
 <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
 <button
 type="button"
 onClick={() => setViewMode('grid')}
 aria-label="Grid View"
 className={`p-1.5 rounded-lg transition ${
 viewMode === 'grid'
 ? 'bg-white text-brand-600 font-bold'
 : 'text-slate-500 hover:text-slate-800'
 }`}
 title="Grid view"
 >
 <LayoutGrid className="w-4 h-4" />
 </button>
 <button
 type="button"
 onClick={() => setViewMode('list')}
 aria-label="List View"
 className={`p-1.5 rounded-lg transition ${
 viewMode === 'list'
 ? 'bg-white text-brand-600 font-bold'
 : 'text-slate-500 hover:text-slate-800'
 }`}
 title="List view"
 >
 <List className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>

 {/* Active Filters Strip with (×) quick-remove */}
 {hasActiveFilters && (
 <div className="flex items-center gap-2 pb-4 flex-wrap text-xs">
 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
 Active:
 </span>
 {searchQuery && (
 <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full border border-brand-100 font-medium">
 "{searchQuery}"
 <button
 type="button"
 onClick={() => setSearchQuery('')}
 className="hover:text-brand-900 ml-0.5 font-bold"
 >
 ×
 </button>
 </span>
 )}
 {selectedCategory && selectedCategory !== 'All' && (
 <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 font-medium">
 Category: {selectedCategory}
 <button
 type="button"
 onClick={() => setSelectedCategory('All')}
 className="hover:text-slate-900 ml-0.5 font-bold"
 >
 ×
 </button>
 </span>
 )}
 {activeCity !== 'All Locations' && (
 <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 font-medium">
 {activeCity}
 <button
 type="button"
 onClick={() => handleCityChange('All Locations')}
 className="hover:text-slate-900 ml-0.5 font-bold"
 >
 ×
 </button>
 </span>
 )}
 {radiusKm !== 'all' && (
 <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 font-medium">
 Within {radiusKm} km
 <button
 type="button"
 onClick={() => setRadiusKm('all')}
 className="hover:text-slate-900 ml-0.5 font-bold"
 >
 ×
 </button>
 </span>
 )}
 {(priceFilter.min || priceFilter.max) && (
 <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 font-medium">
 ₦{priceFilter.min || '0'} - ₦{priceFilter.max || 'Any'}
 <button
 type="button"
 onClick={() => setPriceFilter({ min: '', max: '' })}
 className="hover:text-slate-900 ml-0.5 font-bold"
 >
 ×
 </button>
 </span>
 )}
 {conditionFilter !== 'all' && (
 <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 font-medium capitalize">
 {conditionFilter.replace('-', ' ')}
 <button
 type="button"
 onClick={() => setConditionFilter('all')}
 className="hover:text-slate-900 ml-0.5 font-bold"
 >
 ×
 </button>
 </span>
 )}
 <button
 type="button"
 onClick={handleResetAll}
 className="text-xs text-rose-600 hover:underline font-bold ml-1 cursor-pointer"
 >
 Reset all
 </button>
 </div>
 )}

 {/* Listings Display: Grid View or List View */}
 {loading && displayListings.length === 0 ? (
 <div
 className={
 viewMode === 'grid'
 ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4'
 : 'space-y-3'
 }
 >
 {[1, 2, 3, 4, 5, 6].map((n) => (
 <div
 key={n}
 className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3 animate-pulse"
 >
 <div className="w-full aspect-square bg-slate-200 rounded-xl"></div>
 <div className="h-4 bg-slate-200 rounded w-3/4"></div>
 <div className="h-3 bg-slate-200 rounded w-1/2"></div>
 </div>
 ))}
 </div>
 ) : displayListings.length > 0 ? (
 viewMode === 'grid' ? (
 <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
 {displayListings.map((item) => (
 <ListingCard key={item._id} listing={item} layout="grid" />
 ))}
 </div>
 ) : (
 <div className="space-y-3">
 {displayListings.map((item) => (
 <ListingCard key={item._id} listing={item} layout="list" />
 ))}
 </div>
 )
 ) : (
 <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-4 max-w-md mx-auto my-6">
 <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto">
 <AlertCircle className="w-7 h-7" />
 </div>
 <div className="space-y-1">
 <h3 className="font-bold text-slate-900 text-base">No listings found</h3>
 <p className="text-xs text-slate-500 max-w-sm mx-auto">
 No items or services match your current query, category, or radius filter.
 </p>
 </div>
 <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
 <button
 type="button"
 onClick={handleResetAll}
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition"
 >
 Clear All Filters
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 </main>

 {/* Mobile Draggable Bottom Sheet Filter Drawer */}
 <ResponsiveSheet
 open={mobileFilterDrawerOpen}
 onClose={() => setMobileFilterDrawerOpen(false)}
 title="Filters & Facets"
 showDefaultHeader={false}
 maxWidth="max-w-md"
 bodyClassName="p-0"
 >
 <FilterSidebar
 categories={categories}
 selectedCategory={selectedCategory}
 onSelectCategory={(cat) => setSelectedCategory(cat)}
 mode={mode}
 priceFilter={priceFilter}
 onPriceChange={(newPrice) => setPriceFilter(newPrice)}
 conditionFilter={conditionFilter}
 onConditionChange={(c) => setConditionFilter(c)}
 activeCity={activeCity}
 onCityChange={(city) => handleCityChange(city)}
 radiusKm={radiusKm}
 onRadiusChange={(r) => setRadiusKm(r)}
 onResetAll={handleResetAll}
 onClose={() => setMobileFilterDrawerOpen(false)}
 totalResults={displayListings.length}
 />
 </ResponsiveSheet>
 </div>
 </PullToRefresh>
 );
}
