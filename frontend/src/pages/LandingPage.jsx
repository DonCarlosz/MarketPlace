import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Users,
  Compass,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  const { setMode, userLocation, setSearchQuery } = useMode();
  const { openAuthModal, user } = useAuth();
  const navigate = useNavigate();

  const [localSearch, setLocalSearch] = useState('');
  const [featuredListings, setFeaturedListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch top 6 trending listings for preview
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await API.get('/listings', { params: { limit: 6, sort: 'newest' } });
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setSearchQuery(localSearch.trim());
      navigate('/market');
    } else {
      navigate('/market');
    }
  };

  const handleModeNavigate = (modeId) => {
    setMode(modeId);
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Hero Section - Inspired by Amazon, Etsy & Pinterest */}
      <section className="relative bg-white border-b border-slate-200 overflow-hidden py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        {/* Subtle decorative background blur shapes */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Zero Middlemen • Zero Platform Fees • Safe Local Deals</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Your community's direct <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
              local marketplace.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Discover pre-loved second-hand bargains, brand-new goods from local creators, and hire
            trusted neighborhood handwork — all with direct in-person inspection and off-platform payments.
          </p>

          {/* Quick Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto flex items-center gap-2 bg-slate-100/80 p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition"
          >
            <Search className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search items, electronics, furniture, barbers, tutors..."
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 px-2 py-2 focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-100 transition shrink-0"
            >
              Search
            </button>
          </form>

          {/* Location Badge & Popular Searches */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 flex-wrap pt-1">
            <span className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              {userLocation.city || 'All Nigerian Towns'}
            </span>
            <span className="text-slate-400">•</span>
            <span>Popular:</span>
            {['Phones', 'Generators', 'Bicycles', 'Barbers', 'Nail Techs'].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setSearchQuery(term);
                  navigate('/market');
                }}
                className="hover:text-indigo-600 underline underline-offset-2 transition"
              >
                {term}
              </button>
            ))}
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
            <Link
              to="/market"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-lg shadow-slate-200 transition"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Marketplace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handlePostClick}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold border border-slate-300 shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>Post Listing Free</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. The 3 Core Modes - Interactive Pillars */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Three Ways to Trade in Your Neighborhood
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Whether you are buying gently-used goods, discovering brand-new products, or hiring skilled services.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Second-hand */}
          <div
            onClick={() => handleModeNavigate('second-hand')}
            className="group relative bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition shadow-sm">
                <RefreshCw className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Pre-Loved & Graded
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Second-Hand Goods</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Declutter or score huge bargains on gently-used electronics, road bikes, furniture,
                  clothing, and tools directly from verified community members.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
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
            className="group relative bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 hover:border-emerald-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Factory-Sealed & Crafts
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Brand-New Items</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Support local merchants, boutique creators, and tech retailers. Find brand-new,
                  boxed gadgets, organic beauty products, home decor, and fashion.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
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
            className="group relative bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 hover:border-purple-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition shadow-sm">
                <Wrench className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
                  Skilled Handwork & Pros
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Local Handwork & Services</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Book skilled neighborhood professionals on demand. Master barbers, braiders,
                  photographers, auto mechanics, deep cleaners, and private math tutors.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
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

      {/* 3. How Safe Local Meetups Work (Trust & Zero Liability) */}
      <section className="bg-white border-y border-slate-200 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Safe Deal Blueprint</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              How Safe Community Commerce Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              No wire transfer scams. No middleman transaction fees. Inspect in person before you pay.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-100">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Explore Nearby by Radius</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filter deals in your exact Nigerian town (Uromi, Abraka, Benin, Warri, Lagos, etc.) with
                accurate distance tags to find items and services in your neighborhood.
              </p>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-100">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Direct In-App Negotiation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Send a message request to the seller or provider. Negotiate terms, check availability,
                and choose a safe, public meetup location (malls, busy cafés, bank lobbies).
              </p>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-100">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">Inspect First, Pay Directly</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Meet in person. Test electronics, inspect condition, or review handwork. Pay the seller
                directly via cash or instant local bank transfer with zero platform deductions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Trending Deals Preview */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Trending in Your Community</h2>
            <p className="text-xs text-slate-500 mt-1">
              Freshly published items and handwork ready for meetup & inspection.
            </p>
          </div>

          <Link
            to="/market"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition"
          >
            <span>View All in Market</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading community listings...</div>
        ) : featuredListings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-8">
            <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No listings posted yet</p>
            <p className="text-xs text-slate-400 mt-1">Be the first to list an item or service in your area!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredListings.map((item) => (
              <ListingCard key={item._id} listing={item} />
            ))}
          </div>
        )}
      </section>

      {/* 5. Call To Action Footer Banner */}
      <section className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to declutter or offer your skills locally?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Reach buyers right in your town with zero listing fees. Post second-hand items, new products,
            or offer your handwork services in less than 2 minutes.
          </p>
          <div className="pt-2">
            <button
              onClick={handlePostClick}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-xl shadow-indigo-900/40 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Your First Listing Free</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
