import React, { useState, useEffect, useRef } from 'react';
import { useMode } from '../context/ModeContext';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { getSocket } from '../services/socket';
import { resolveCityCoordinates, calculateDistanceKm, NIGERIAN_CITIES } from '../utils/geo';
import ListingCard from '../components/ListingCard';
import SafetyBanner from '../components/SafetyBanner';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  RefreshCw,
  Sparkles,
  Wrench,
  AlertCircle,
  ChevronDown,
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

const POPULAR_LOCATIONS = [
  'All Locations',
  'Uromi',
  'Abraka',
  'Ekpoma',
  'Benin City',
  'Warri',
  'Asaba',
  'Lagos',
  'Abuja',
  'Port Harcourt',
];

// Global in-memory cache for instant zero-wait retention
const listingsCache = new Map();

export default function HomePage() {
  const { user } = useAuth();
  const {
    mode,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    radiusKm,
    setRadiusKm,
    userLocation,
    setUserLocation,
  } = useMode();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });
  const [conditionFilter, setConditionFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

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

        // STRICT REQUIREMENT: Users should NOT see what they posted on the marketplace!
        if (user) {
          const currentUserId = (user._id || user.id)?.toString();
          freshListings = freshListings.filter((item) => {
            const sellerId = (item.seller?._id || item.seller?.id || item.seller)?.toString();
            return sellerId !== currentUserId;
          });
        }

        // Compute client-side distances if activeCity is selected
        if (activeCity && activeCity !== 'All Locations') {
          const myCoords = resolveCityCoordinates(activeCity);
          freshListings = freshListings.map((item) => {
            if (item.location?.coordinates?.length === 2) {
              const d = calculateDistanceKm(
                myCoords[0],
                myCoords[1],
                item.location.coordinates[0],
                item.location.coordinates[1]
              );
              return { ...item, distanceKm: d };
            }
            return item;
          });

          // If a radius limit is set, filter client-side as well
          if (radiusKm && radiusKm !== 'all') {
            freshListings = freshListings.filter(
              (item) => item.distanceKm === null || item.distanceKm <= Number(radiusKm)
            );
          }
        }

        listingsCache.set(cacheKey, freshListings);
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

  // Real-time background sync via Socket.io
  useEffect(() => {
    socketRef.current = getSocket();

    const handleListingCreated = (newListing) => {
      if (!newListing) return;
      // Exclude if created by the logged-in user
      if (user) {
        const currentUserId = (user._id || user.id)?.toString();
        const sellerId = (newListing.seller?._id || newListing.seller?.id || newListing.seller)?.toString();
        if (currentUserId && sellerId && currentUserId === sellerId) {
          return;
        }
      }
      if (newListing.mode !== mode && mode !== 'all') return;

      setListings((prev) => {
        if (prev.some((item) => item._id === newListing._id)) return prev;
        const updated = [newListing, ...prev];
        listingsCache.set(getCacheKey(), updated);
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
        listingsCache.set(getCacheKey(), updated);
        return updated;
      });
    };

    const handleListingDeleted = ({ id }) => {
      setListings((prev) => {
        const updated = prev.filter((item) => item._id !== id);
        listingsCache.set(getCacheKey(), updated);
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
  }, [mode, selectedCategory, sortBy, radiusKm, conditionFilter, activeCity, user]);

  // Reset category when switching modes
  useEffect(() => {
    setSelectedCategory('All');
  }, [mode]);

  // Trigger fetch with cache check
  useEffect(() => {
    const cacheKey = getCacheKey();
    const cachedData = listingsCache.get(cacheKey);

    if (cachedData) {
      setListings(cachedData);
      setLoading(false);
    }

    const timer = setTimeout(() => {
      fetchListings(!!cachedData);
    }, 150);

    return () => clearTimeout(timer);
  }, [mode, selectedCategory, sortBy, radiusKm, conditionFilter, activeCity, user]);

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

  // Filter listings where current logged in user is NOT the seller
  const currentUserId = (user?._id || user?.id)?.toString();
  const displayListings = currentUserId
    ? listings.filter((l) => {
        const sellerId = (l.seller?._id || l.seller?.id || l.seller)?.toString();
        return sellerId !== currentUserId;
      })
    : listings;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SafetyBanner />

      {/* Hero & Search Header */}
      <section className="bg-white border-b border-slate-200 py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
            {mode === 'second-hand' && <RefreshCw className="w-3.5 h-3.5" />}
            {mode === 'new' && <Sparkles className="w-3.5 h-3.5" />}
            {mode === 'service' && <Wrench className="w-3.5 h-3.5" />}
            <span>
              {mode === 'new'
                ? 'Brand-New Goods'
                : mode === 'service'
                ? 'Local Services & Handwork'
                : 'Second-Hand & Pre-Owned Items'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Discover {mode === 'service' ? 'trusted local services' : 'great items'} in your community.
          </h1>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto pt-1">
            <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition p-1.5">
              <Search className="w-5 h-5 text-slate-400 ml-2.5 mr-2 shrink-0" />
              <input
                type="text"
                placeholder={`Search ${mode === 'service' ? 'services (e.g., barber, photographer, tutor)...' : 'items (e.g., bike, generator, phone)...'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 py-1.5"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-sm shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Location & Radius Selector with Nigerian Towns */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs text-slate-600 pt-2 flex-wrap">
            {/* Location selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-semibold text-slate-700">Location:</span>
              <select
                value={activeCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer pr-1"
              >
                {POPULAR_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Radius selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-700">Radius:</span>
              <select
                value={radiusKm}
                onChange={(e) =>
                  setRadiusKm(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Distances</option>
                <option value="15">Within 15 km</option>
                <option value="35">Within 35 km</option>
                <option value="75">Within 75 km</option>
                <option value="150">Within 150 km</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills Bar */}
      <section className="bg-white border-b border-slate-200 overflow-x-auto scrollbar-none py-2.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat || (cat === 'All' && !selectedCategory);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm scale-[1.02]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Grid & Filter Controls */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-grow w-full">
        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 capitalize">
              {selectedCategory && selectedCategory !== 'All' ? selectedCategory : 'Available Listings'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {displayListings.length} {displayListings.length === 1 ? 'result' : 'results'} from other users nearby
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>

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
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {filtersOpen && (
          <div className="mb-6 p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Price Range (₦)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min ₦"
                  value={priceFilter.min}
                  onChange={(e) => setPriceFilter({ ...priceFilter, min: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max ₦"
                  value={priceFilter.max}
                  onChange={(e) => setPriceFilter({ ...priceFilter, max: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {mode !== 'service' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Condition</label>
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white cursor-pointer font-medium"
                >
                  <option value="all">Any Condition</option>
                  <option value="brand-new">Brand New</option>
                  <option value="like-new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>
            )}

            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setPriceFilter({ min: '', max: '' });
                  setConditionFilter('all');
                  fetchListings(false);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => fetchListings(false)}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Listings Grid with Clean Responsive Breakpoints (2 columns on mobile, up to 5 on desktop) */}
        {loading && displayListings.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {displayListings.map((item) => (
              <ListingCard key={item._id} listing={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No listings found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no listings matching your current location/radius filters.
            </p>
            {radiusKm !== 'all' && (
              <button
                type="button"
                onClick={() => setRadiusKm('all')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition"
              >
                Expand to All Distances
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
