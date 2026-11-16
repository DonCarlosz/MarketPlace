import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMode } from '../context/ModeContext';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import ListingCard from '../components/ListingCard';
import {
  Store,
  RefreshCw,
  Sparkles,
  Wrench,
  Search,
  MapPin,
  ShieldCheck,
  ArrowRight,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Flame,
  Compass,
  Play,
  Pause,
  Zap,
} from 'lucide-react';

const CATEGORY_TILES = [
  {
    name: 'Electronics & Tech',
    category: 'Electronics',
    mode: 'second-hand',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80',
    tag: 'Pre-owned & New',
  },
  {
    name: 'Vehicles & Parts',
    category: 'Vehicles',
    mode: 'second-hand',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80',
    tag: 'Bikes, Cars & Parts',
  },
  {
    name: 'Fashion & Wears',
    category: 'Fashion & Apparel',
    mode: 'new',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=400&q=80',
    tag: 'Footwear & Fits',
  },
  {
    name: 'Home & Living',
    category: 'Furniture',
    mode: 'second-hand',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80',
    tag: 'Sofas, Tables, Decor',
  },
  {
    name: 'Barbers & Braids',
    category: 'Barbers & Hair',
    mode: 'service',
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80',
    tag: 'Local Stylists',
  },
  {
    name: 'Handwork & Repairs',
    category: 'Home Repair & Handyman',
    mode: 'service',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    tag: 'Mechanics & Techs',
  },
  {
    name: 'Tutors & Lessons',
    category: 'Tutors & Lessons',
    mode: 'service',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80',
    tag: 'Private Lessons',
  },
];

export default function LandingPage() {
  const { setMode, userLocation, setSearchQuery, setSelectedCategory } = useMode();
  const { openAuthModal, user } = useAuth();
  const navigate = useNavigate();

  const [localSearch, setLocalSearch] = useState('');
  const [selectedSearchCat, setSelectedSearchCat] = useState('All');
  const [featuredListings, setFeaturedListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hero banner auto-switching state (3 slides, with slide 1 being white background like Image 6)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Carousel ref for smooth left/right horizontal scrolling
  const carouselRef = useRef(null);

  // Auto-switch hero banner slides every 5.5 seconds when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await API.get('/listings', { params: { limit: 12, sort: 'newest' } });
        if (res.data?.success) {
          setFeaturedListings(res.data.listings || []);
        }
      } catch (err) {
        console.error('Failed to load featured listings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
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

  const handleCategoryClick = (tile) => {
    setMode(tile.mode);
    setSelectedCategory(tile.category);
    navigate('/market');
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

  return (
    <div className="min-h-screen bg-white flex flex-col space-y-8 sm:space-y-12 pb-16">
      {/* 1. eBay-style Top Clean Search Section */}
      <section className="bg-slate-50 border-b border-slate-200/80 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 max-w-4xl mx-auto bg-white p-1.5 rounded-full border border-slate-300 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition"
          >
            <div className="flex items-center gap-2 flex-1 pl-3">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search for anything (phones, bikes, tools, barbers, tutors...)"
                className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none py-1.5"
              />
            </div>

            {/* Category Dropdown inside search bar */}
            <select
              value={selectedSearchCat}
              onChange={(e) => setSelectedSearchCat(e.target.value)}
              className="hidden md:block bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-full px-3 py-1.5 border border-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Vehicles">Vehicles</option>
              <option value="Fashion & Apparel">Fashion</option>
              <option value="Furniture">Home & Furniture</option>
              <option value="Barbers & Hair">Barbers & Hair</option>
              <option value="Home Repair & Handyman">Handwork</option>
              <option value="Tutors & Lessons">Tutors</option>
            </select>

            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-sm transition shrink-0"
            >
              Search
            </button>
          </form>

          {/* Clean Quick Category Sub-links & Town Tag */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs text-slate-600 flex-wrap pt-0.5">
            <span className="font-semibold text-slate-500">Popular:</span>
            {['Phones', 'Electronics', 'Road Bikes', 'Furniture', 'Barbers', 'Mechanics'].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setSearchQuery(term);
                  navigate('/market');
                }}
                className="hover:text-indigo-600 transition"
              >
                {term}
              </button>
            ))}
            <span className="text-slate-300">•</span>
            <div className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 text-[11px]">
              <MapPin className="w-3 h-3 text-indigo-600" />
              <span>{userLocation.city || 'All Nigerian Towns'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Auto-Switching Hero Banner (Images 2 & 6 Inspired) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden min-h-[250px] sm:min-h-[280px] shadow-sm transition-all duration-300">
          {/* SLIDE 1: Clean White Background with Vibrant Cutout Product Collage (Image 6) */}
          {currentSlide === 0 && (
            <div className="bg-white border border-slate-200/90 p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 min-h-[250px] sm:min-h-[280px] animate-in fade-in duration-300">
              <div className="max-w-md space-y-3.5 z-10">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-100">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>Direct Local Deals</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Great local finds. Direct deals.
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Find pre-owned items, crafts, and neighborhood handwork with zero wire transfer risks.
                </p>
                <div className="pt-1">
                  <Link
                    to="/market"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-sm transition"
                  >
                    <span>Explore market</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right Side: Vibrant product collage cards matching Image 6 */}
              <div className="flex items-center justify-center md:justify-end gap-3 flex-wrap sm:flex-nowrap">
                <div className="w-24 sm:w-28 rounded-2xl bg-blue-500 p-2 shadow-md transform -rotate-3 hover:rotate-0 transition">
                  <img
                    src="https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=300&q=80"
                    alt="Gadget Watch"
                    className="w-full aspect-square object-cover rounded-xl"
                  />
                  <div className="text-[10px] font-bold text-white text-center mt-1">Smart Watch</div>
                </div>

                <div className="w-28 sm:w-32 rounded-2xl bg-rose-500 p-2 shadow-lg transform rotate-2 hover:rotate-0 transition z-10">
                  <img
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80"
                    alt="Audio Gear"
                    className="w-full aspect-square object-cover rounded-xl"
                  />
                  <div className="text-[10px] font-bold text-white text-center mt-1">Pro Audio</div>
                </div>

                <div className="w-24 sm:w-28 rounded-2xl bg-emerald-600 p-2 shadow-md transform rotate-6 hover:rotate-0 transition">
                  <img
                    src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=300&q=80"
                    alt="Camera Gear"
                    className="w-full aspect-square object-cover rounded-xl"
                  />
                  <div className="text-[10px] font-bold text-white text-center mt-1">Vintage Optics</div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Rich Burgundy / Deep Berry with Savings Cards (Image 2) */}
          {currentSlide === 1 && (
            <div className="bg-[#481228] text-white p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 min-h-[250px] sm:min-h-[280px] animate-in fade-in duration-300">
              <div className="max-w-md space-y-3.5 z-10">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-300 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/15">
                  <Flame className="w-3.5 h-3.5 text-pink-400" />
                  <span>Community Savings</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  Score big savings on local gear.
                </h2>
                <p className="text-xs sm:text-sm text-pink-100 leading-relaxed">
                  Upgrades for your ride, phones, home appliances, and daily tools across your town.
                </p>
                <div className="pt-1">
                  <Link
                    to="/market"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-pink-100 hover:bg-white text-slate-900 font-bold text-xs sm:text-sm shadow-sm transition"
                  >
                    <span>View deals</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right Side: Angled coupon cards matching Image 2 */}
              <div className="flex items-center justify-center md:justify-end gap-3 flex-wrap sm:flex-nowrap">
                <div className="w-28 sm:w-32 bg-pink-200 text-slate-900 rounded-2xl p-3 shadow-lg transform -rotate-6 hover:rotate-0 transition">
                  <div className="w-full aspect-square rounded-xl bg-pink-300/60 flex items-center justify-center mb-1 font-black text-xs text-pink-900">
                    DEALS
                  </div>
                  <div className="text-[11px] font-bold leading-tight">Parts & accessories</div>
                </div>

                <div className="w-32 sm:w-36 bg-pink-400 text-slate-900 rounded-2xl p-3 shadow-xl transform rotate-3 hover:rotate-0 transition z-10">
                  <div className="w-full aspect-square rounded-xl bg-pink-500/30 flex flex-col items-center justify-center mb-1 font-black text-lg text-slate-900">
                    <span>10%</span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold">OFF</span>
                  </div>
                  <div className="text-[11px] font-bold text-center">Local Bargains</div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: Vibrant Royal Indigo (Brand Mood) */}
          {currentSlide === 2 && (
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 min-h-[250px] sm:min-h-[280px] animate-in fade-in duration-300">
              <div className="max-w-md space-y-3.5 z-10">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-300 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/15">
                  <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                  <span>On-Demand Skills</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  Neighborhood handwork on demand.
                </h2>
                <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
                  Book trusted neighborhood barbers, braiders, mechanics, cleaners, and private tutors.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleModeNavigate('service')}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-sm transition"
                  >
                    <span>Find skilled pros</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Side: Pro handwork tiles */}
              <div className="flex items-center justify-center md:justify-end gap-3 flex-wrap sm:flex-nowrap">
                <div className="w-28 sm:w-32 bg-white rounded-2xl p-2.5 shadow-lg transform -rotate-3 hover:rotate-0 transition text-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80"
                    alt="Barber"
                    className="w-full aspect-square object-cover rounded-xl mb-1.5"
                  />
                  <div className="text-[10px] font-bold truncate">Master Barber</div>
                  <div className="text-[9px] text-purple-600 font-semibold">Fixed Sessions</div>
                </div>

                <div className="w-28 sm:w-32 bg-white rounded-2xl p-2.5 shadow-xl transform rotate-3 hover:rotate-0 transition text-slate-900 z-10">
                  <img
                    src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=80"
                    alt="Mechanic"
                    className="w-full aspect-square object-cover rounded-xl mb-1.5"
                  />
                  <div className="text-[10px] font-bold truncate">Auto Mechanics</div>
                  <div className="text-[9px] text-emerald-600 font-semibold">Starting-At</div>
                </div>
              </div>
            </div>
          )}

          {/* eBay-style Slider Navigation Controls (Dots & Play/Pause & Chevrons) */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-white">
            {/* Slide dots */}
            <div className="flex items-center gap-1.5 px-1">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentSlide === idx ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>

            <span className="text-white/40 text-xs">|</span>

            {/* Left / Right arrows */}
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev === 0 ? 2 : prev - 1))}
              aria-label="Previous slide"
              className="p-1 hover:text-indigo-200 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % 3)}
              aria-label="Next slide"
              className="p-1 hover:text-indigo-200 transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Play / Pause toggle button */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
              className="p-1 hover:text-indigo-200 transition"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </section>

      {/* 3. Category Square Tiles: "Explore by Category" (Image 4 Style) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Explore by Category</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse top trending categories in your community.
            </p>
          </div>
          <Link
            to="/market"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
          >
            <span>See all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Clean rounded square cards (Image 4) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {CATEGORY_TILES.map((tile) => (
            <button
              key={tile.name}
              type="button"
              onClick={() => handleCategoryClick(tile)}
              className="group flex flex-col items-center p-3 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-400 hover:shadow-md transition text-center cursor-pointer"
            >
              <div className="w-full aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2.5 relative">
                <img
                  src={tile.image}
                  alt={tile.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  loading="lazy"
                />
              </div>
              <span className="font-bold text-xs text-slate-800 group-hover:text-indigo-600 transition line-clamp-1">
                {tile.name}
              </span>
              <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                {tile.tag}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Horizontal Scrollable Deals Carousel: "Today's Highlights" (Image 5 Style) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-100 mb-1">
              <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>Today's Highlights</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Trending Deals Near You
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified items and services ready for meetup and inspection.
            </p>
          </div>

          {/* Left & Right Chevron Carousel Navigation Buttons (Image 5) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              aria-label="Scroll left"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center shadow-sm transition active:scale-90"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              aria-label="Scroll right"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center shadow-sm transition active:scale-90"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with Smooth Scroll */}
        {loading ? (
          <div className="flex gap-4 overflow-x-hidden py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="w-[180px] sm:w-[220px] shrink-0 bg-white rounded-2xl border border-slate-200 p-3 space-y-3 animate-pulse"
              >
                <div className="w-full aspect-square bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
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
          <div
            ref={carouselRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-4 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {featuredListings.map((item) => (
              <div key={item._id} className="w-[170px] sm:w-[210px] md:w-[220px] shrink-0">
                <ListingCard listing={item} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Light-Themed Promo Showcase Card (Replacing the dark card with light e-commerce aesthetic) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="rounded-2xl sm:rounded-3xl bg-slate-100/90 border border-slate-200/90 p-6 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-indigo-700 border border-slate-200 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Zero Deductions • Direct Local Trade</span>
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Endless local finds. Epic community prices.
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Browse thousands of pre-owned gadgets, vehicle upgrades, home crafts, and neighborhood
              handwork across Nigeria. Pay in person when you are completely satisfied.
            </p>

            <div className="pt-1">
              <Link
                to="/market"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95"
              >
                <span>Shop now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Showcase Products: Clean preview cards on light background */}
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden py-2">
            <div className="w-32 sm:w-36 bg-white rounded-2xl p-2.5 shadow-sm border border-slate-200 transform -rotate-3 hover:rotate-0 transition">
              <div className="w-full aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2">
                <img
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80"
                  alt="Headphones"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-[10px] font-bold text-slate-900 truncate">Studio Headphones</div>
              <div className="text-[10px] font-extrabold text-indigo-600">₦45,000</div>
            </div>

            <div className="w-36 sm:w-40 bg-white rounded-2xl p-3 shadow-md border border-slate-200 transform rotate-2 hover:rotate-0 transition z-10">
              <div className="w-full aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2">
                <img
                  src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80"
                  alt="Smart Chrono"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-[11px] font-bold text-slate-900 truncate">Smart Chrono Series</div>
              <div className="text-[11px] font-extrabold text-emerald-600">₦62,000</div>
            </div>

            <div className="w-32 sm:w-36 bg-white rounded-2xl p-2.5 shadow-sm border border-slate-200 transform rotate-6 hover:rotate-0 transition">
              <div className="w-full aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2">
                <img
                  src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80"
                  alt="Vintage Camera"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-[10px] font-bold text-slate-900 truncate">Vintage Optical</div>
              <div className="text-[10px] font-extrabold text-indigo-600">₦85,000</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. The 3 Core Trading Modes: Interactive Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
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
            className="group relative bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-indigo-400 hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition shadow-sm">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
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

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
              <span>Browse Second-hand</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Pillar 2: New Items */}
          <div
            onClick={() => handleModeNavigate('new')}
            className="group relative bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-400 hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition shadow-sm">
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
            className="group relative bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-purple-400 hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition shadow-sm">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                  Skilled Handwork & Pros
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

      {/* 7. Secondary Lifestyle Promo Banner (The user confirmed this image should remain) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 text-white min-h-[220px] sm:min-h-[250px] flex items-center">
          <img
            src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=80"
            alt="Community Perks"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent" />

          <div className="relative z-10 p-6 sm:p-10 max-w-xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Don't miss out on community perks
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              List unused items in 2 minutes, discover hidden gems right in your town, and chat securely with verified neighbors.
            </p>
            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={handlePostClick}
                className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm transition shadow-sm"
              >
                Post a Listing
              </button>
              <Link
                to="/market"
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 backdrop-blur-sm transition"
              >
                Explore market
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Safe Local Meetup Blueprint (Trust & Zero-Liability) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-slate-50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-6">
          <div className="text-center space-y-1.5 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Safe Deal Blueprint</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              How Safe Community Commerce Works
            </h2>
            <p className="text-xs text-slate-500">
              Inspect in person before you pay. Direct peer-to-peer deals with zero middleman deductions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900">Explore Nearby by Radius</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filter deals in your exact town (Uromi, Abraka, Ekpoma, Benin, Warri, Lagos) with calculated distance tags.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900">Direct In-App Chat</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Send a message request to the seller or service provider. Agree on terms and choose a safe, public meetup location.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
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
  );
}
