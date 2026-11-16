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
  CheckCircle2,
  TrendingUp,
  Tag,
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
  const [featuredListings, setFeaturedListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carousel ref for smooth left/right horizontal scrolling
  const carouselRef = useRef(null);

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
    <div className="min-h-screen bg-slate-50 flex flex-col space-y-12 sm:space-y-16 pb-12">
      {/* 1. Hero Banner: Wide Photographic eBay-style Banner (Images 1 & 6) */}
      <section className="relative bg-slate-900 text-white overflow-hidden">
        {/* Background lifestyle imagery with dark gradient overlay for text readability */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1600&q=80"
            alt="Community Marketplace Deals"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md text-indigo-300 border border-white/15">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Zero Middlemen • Zero Platform Fees • Safe Local Deals</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
              Get more with your <br />
              <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
                local community.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Buy pre-loved second-hand bargains, support neighborhood creators selling brand-new items,
              or hire skilled local handwork — inspect in person with zero wire transfer risks.
            </p>

            {/* Quick Search Form */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl shadow-xl border border-white/20 text-slate-900 max-w-xl"
            >
              <Search className="w-5 h-5 text-slate-400 ml-2.5 shrink-0" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search items, electronics, generators, barbers..."
                className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 px-2 py-2 focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition shrink-0"
              >
                Search
              </button>
            </form>

            {/* Quick Location & CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/market"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs sm:text-sm font-bold shadow-md transition"
              >
                <Compass className="w-4 h-4 text-indigo-600" />
                <span>Explore Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={handlePostClick}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 backdrop-blur-sm transition"
              >
                <PlusCircle className="w-4 h-4 text-indigo-300" />
                <span>Post Listing Free</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>{userLocation.city || 'Uromi & Nigerian Towns'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Square Tiles: "The Best in Your Community" (Images 1 & 4) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Explore by Category</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Popular community categories in your local area.
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

        {/* Responsive row of rounded category cards with clean imagery (Image 4) */}
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
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
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

      {/* 3. Horizontal Scrollable Carousel: "Today's Highlights & Deals" (Image 5) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-100 mb-1">
              <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>Today's Highlights</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Trending Deals Near You
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Freshly posted items and services ready for meetup & inspection.
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
              <div key={item._id} className="w-[170px] sm:w-[220px] md:w-[230px] shrink-0">
                <ListingCard listing={item} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Dark Lifestyle Feature Card (Image 2 & 6 inspired) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative rounded-3xl bg-slate-950 text-white overflow-hidden border border-slate-800 shadow-2xl p-6 sm:p-10 lg:p-12">
          {/* Ambient radial lighting */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Copy & Shop Pill */}
            <div className="lg:col-span-7 space-y-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-indigo-300 border border-white/10">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Zero Deductions • Direct Local Trade</span>
              </span>

              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Endless local finds. <br />
                Epic community prices.
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
                Browse thousands of pre-owned gadgets, vehicle upgrades, home crafts, and neighborhood
                handwork across Nigeria. Pay in person when you are completely satisfied.
              </p>

              <div className="pt-2">
                <Link
                  to="/market"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-black text-xs sm:text-sm shadow-xl transition active:scale-95"
                >
                  <span>Shop now</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </Link>
              </div>
            </div>

            {/* Right Showcase Products: Angled floating preview cards matching Image 2 */}
            <div className="lg:col-span-5 flex items-center justify-center sm:justify-end gap-3 sm:gap-4 overflow-hidden py-4">
              {/* Card 1: Angled left */}
              <div className="w-32 sm:w-40 bg-white rounded-2xl p-2.5 shadow-xl transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                <div className="w-full aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2">
                  <img
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80"
                    alt="Premium Audio"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] font-bold text-slate-900 truncate">Studio Headphones</div>
                <div className="text-[10px] font-black text-indigo-600">₦45,000</div>
              </div>

              {/* Card 2: Angled center */}
              <div className="w-36 sm:w-44 bg-white rounded-2xl p-3 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300 z-10">
                <div className="w-full aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2">
                  <img
                    src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80"
                    alt="Smart Watch"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[11px] font-bold text-slate-900 truncate">Smart Chrono Series</div>
                <div className="text-[11px] font-black text-emerald-600">₦62,000</div>
              </div>

              {/* Card 3: Angled right */}
              <div className="w-32 sm:w-40 bg-white rounded-2xl p-2.5 shadow-xl transform rotate-8 hover:rotate-0 transition-transform duration-300">
                <div className="w-full aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2">
                  <img
                    src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80"
                    alt="Camera Gear"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] font-bold text-slate-900 truncate">Vintage Optical</div>
                <div className="text-[10px] font-black text-indigo-600">₦85,000</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. The 3 Core Trading Modes: Interactive Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
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
            className="group relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-indigo-400 hover:shadow-lg transition duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition shadow-sm">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Pre-Loved & Graded
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Second-Hand Goods</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
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

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
              <span>Browse Second-hand</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Pillar 2: New Items */}
          <div
            onClick={() => handleModeNavigate('new')}
            className="group relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-emerald-400 hover:shadow-lg transition duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Factory-Sealed & Crafts
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Brand-New Items</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
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

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
              <span>Shop Brand-New</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Pillar 3: Local Services */}
          <div
            onClick={() => handleModeNavigate('service')}
            className="group relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-purple-400 hover:shadow-lg transition duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition shadow-sm">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                  Skilled Handwork & Pros
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Local Handwork & Services</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
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

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-purple-600 group-hover:text-purple-700">
              <span>Find Skilled Services</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      </section>

      {/* 6. Secondary Lifestyle Promo Banner: "Don't miss out on community perks" (Image 6) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white min-h-[260px] sm:min-h-[300px] flex items-center">
          <img
            src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=80"
            alt="Community Perks"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent" />

          <div className="relative z-10 p-6 sm:p-10 lg:p-12 max-w-xl space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Don't miss out on community perks
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              List unused items in 2 minutes, discover hidden gems right in your town, and chat securely with verified neighbors.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handlePostClick}
                className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm transition shadow-md"
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
      </section>

      {/* 7. Safe Local Meetup Blueprint (Trust & Zero-Liability) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-8">
          <div className="text-center space-y-1.5 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Safe Deal Blueprint</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              How Safe Community Commerce Works
            </h2>
            <p className="text-xs text-slate-500">
              Inspect in person before you pay. Direct peer-to-peer deals with zero middleman deductions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-md shadow-indigo-100">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900">Explore Nearby by Radius</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filter deals in your exact town (Uromi, Abraka, Ekpoma, Benin, Warri, Lagos) with calculated distance tags.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-md shadow-indigo-100">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900">Direct In-App Chat</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Send a message request to the seller or service provider. Agree on terms and choose a safe, public meetup location.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-md shadow-indigo-100">
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
