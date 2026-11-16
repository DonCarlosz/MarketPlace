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

  // Auto-switching Hero banner state (fixed height, 3 slides)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const carouselRef = useRef(null);

  // Auto-switch hero banner slides every 5.5 seconds with smooth horizontal slide
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
    <div className="min-h-screen bg-white flex flex-col pb-16">
      {/* 1. eBay-Style Top Search Section (Clean & Tight) */}
      <section className="bg-slate-50 border-b border-slate-200/90 pt-3 pb-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-2">
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

            {/* Category Dropdown */}
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

          {/* Quick Category Sub-links & Location Tag */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs text-slate-600 flex-wrap">
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
              <span>{userLocation.city || 'All Locations'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Full-Bleed Auto-Switching Hero Banner (Zero margins, Smooth Horizontal Sliding, Fixed Proportional Height) */}
      <section className="w-full relative overflow-hidden bg-slate-900 border-b border-slate-200">
        {/* Fixed height container: h-[340px] sm:h-[360px] md:h-[375px] leaves visible white space at bottom */}
        <div className="relative w-full h-[340px] sm:h-[360px] md:h-[375px] overflow-hidden">
          {/* Smooth Horizontal Sliding Track (translates horizontally smoothly from right to left like eBay) */}
          <div
            className="flex w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {/* SLIDE 1: Clean White Background with Large Cutout Product Cards */}
            <div className="w-full h-full flex-shrink-0 relative bg-white border-b border-slate-200 overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 h-full flex items-center justify-between gap-6 lg:gap-10">
                {/* Left Content: Natural flow without early breaking, proportionate header size */}
                <div className="flex-1 max-w-xl space-y-3.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Zero Platform Fees • Direct Local Meetups</span>
                  </span>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    Great local finds. Direct deals.
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                    Find pre-owned tech, vehicles, home furniture, and neighborhood handwork with zero wire transfer risks.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/market"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition"
                    >
                      <span>Explore market</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Right Content: Prominent Large Product Cards (enlarged, filling the right side without gap) */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0 pr-2 sm:pr-6">
                  {/* Card 1 */}
                  <div className="w-32 h-34 sm:w-40 sm:h-42 md:w-44 md:h-44 rounded-2xl bg-blue-500 p-2.5 shadow-md transform -rotate-1 hover:rotate-0 transition duration-200 flex flex-col justify-between">
                    <img
                      src="https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=400&q=80"
                      alt="Smart Watch"
                      className="w-full h-22 sm:h-28 md:h-30 object-cover rounded-xl"
                    />
                    <div className="text-xs font-bold text-white text-center truncate">Smart Watch</div>
                  </div>

                  {/* Card 2 */}
                  <div className="w-32 h-34 sm:w-40 sm:h-42 md:w-44 md:h-44 rounded-2xl bg-rose-500 p-2.5 shadow-lg transform rotate-2 hover:rotate-0 transition duration-200 flex flex-col justify-between">
                    <img
                      src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80"
                      alt="Audio Gear"
                      className="w-full h-22 sm:h-28 md:h-30 object-cover rounded-xl"
                    />
                    <div className="text-xs font-bold text-white text-center truncate">Pro Audio</div>
                  </div>

                  {/* Card 3 */}
                  <div className="w-32 h-34 sm:w-40 sm:h-42 md:w-44 md:h-44 rounded-2xl bg-emerald-600 p-2.5 shadow-md transform rotate-1 hover:rotate-0 transition duration-200 flex flex-col justify-between">
                    <img
                      src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80"
                      alt="Camera Gear"
                      className="w-full h-22 sm:h-28 md:h-30 object-cover rounded-xl"
                    />
                    <div className="text-xs font-bold text-white text-center truncate">Vintage Optics</div>
                  </div>

                  {/* Card 4 */}
                  <div className="w-32 h-34 sm:w-40 sm:h-42 md:w-44 md:h-44 rounded-2xl bg-amber-500 p-2.5 shadow-md transform -rotate-2 hover:rotate-0 transition duration-200 flex flex-col justify-between">
                    <img
                      src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=400&q=80"
                      alt="Fashion Sneaker"
                      className="w-full h-22 sm:h-28 md:h-30 object-cover rounded-xl"
                    />
                    <div className="text-xs font-bold text-white text-center truncate">Sneakers & Wears</div>
                  </div>
                </div>
              </div>
            </div>

            {/* SLIDE 2: Real Photographic Background Image (Community Life & Account Perks) */}
            <div className="w-full h-full flex-shrink-0 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1800&q=80"
                alt="Community Life and Meetups"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />

              <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 h-full flex items-center">
                <div className="max-w-xl space-y-3.5 text-white">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Direct Peer-to-Peer Community</span>
                  </span>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
                    Get more with a LocalMarket account.
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-lg">
                    Enjoy direct member messaging, instant deal notifications, and zero listing fees across your neighborhood.
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePostClick}
                      className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm shadow-lg transition active:scale-95"
                    >
                      {user ? 'Post a Listing' : 'Sign in to Start'}
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
            </div>

            {/* SLIDE 3: On-Demand Neighborhood Handwork with Gradient Fade & Large Service Cards */}
            <div className="w-full h-full flex-shrink-0 relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white border-b border-indigo-900/40">
              <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 h-full flex items-center justify-between gap-6 lg:gap-10">
                {/* Left Content: No early breaking, proportionate header size */}
                <div className="flex-1 max-w-xl space-y-3.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-100 bg-white/15 px-3 py-1 rounded-full border border-white/20">
                    <Wrench className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Skilled Handwork & Pros</span>
                  </span>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
                    Neighborhood handwork on demand.
                  </h2>
                  <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed max-w-lg">
                    Book trusted local barbers, braiders, mechanics, cleaners, and private tutors directly in your town.
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleModeNavigate('service')}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition"
                    >
                      <span>Find skilled pros</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right Content: Large Prominent Service Cards (enlarged to eliminate void) */}
                <div className="flex items-center gap-4 shrink-0 pr-2 sm:pr-6">
                  {/* Barber Card */}
                  <div className="w-44 sm:w-56 md:w-60 h-52 sm:h-60 bg-white text-slate-900 rounded-2xl p-3 sm:p-3.5 shadow-xl transform -rotate-1 hover:rotate-0 transition flex flex-col justify-between">
                    <div className="w-full h-28 sm:h-34 rounded-xl overflow-hidden mb-2">
                      <img
                        src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80"
                        alt="Barber"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">Master Barber</div>
                      <div className="text-[11px] text-purple-600 font-bold">Fixed Sessions</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">Fades, Beard & Styling</div>
                    </div>
                  </div>

                  {/* Mechanic Card */}
                  <div className="w-44 sm:w-56 md:w-60 h-52 sm:h-60 bg-white text-slate-900 rounded-2xl p-3 sm:p-3.5 shadow-xl transform rotate-1 hover:rotate-0 transition flex flex-col justify-between">
                    <div className="w-full h-28 sm:h-34 rounded-xl overflow-hidden mb-2">
                      <img
                        src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80"
                        alt="Mechanic"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">Auto Mechanics</div>
                      <div className="text-[11px] text-emerald-600 font-bold">Starting-At</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">Engine, Brakes & Tune-up</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* eBay-Style Controls Cluster (Bottom Right Chevrons & Play/Pause) */}
          <div className="absolute bottom-3 right-6 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-white shadow-md">
            {/* Slide indicator dots */}
            <div className="flex items-center gap-1.5 px-1">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    currentSlide === idx ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/70 w-2'
                  }`}
                />
              ))}
            </div>

            <span className="text-white/30 text-xs px-0.5">|</span>

            {/* Left Chevron */}
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev === 0 ? 2 : prev - 1))}
              aria-label="Previous slide"
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white text-white hover:text-slate-900 flex items-center justify-center transition active:scale-90"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Right Chevron */}
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % 3)}
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

      {/* 3. Category Square Tiles: "Explore by Category" (Image 4 Style) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-8 sm:pt-10">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-10 sm:pt-12">
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

      {/* 5. Light-Themed Promo Showcase Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-10 sm:pt-12">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-10 sm:pt-12">
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

      {/* 7. Secondary Lifestyle Promo Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-10 sm:pt-12">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-10 sm:pt-12">
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
