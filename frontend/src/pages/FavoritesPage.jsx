import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';
import { Heart, Compass, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';

export default function FavoritesPage() {
 const { user, openAuthModal } = useAuth();
 const { favoriteListings, fetchFavorites, loading, count } = useFavorites();
 const [filterMode, setFilterMode] = useState('all');

 useEffect(() => {
 if (user) {
 fetchFavorites();
 }
 }, [user, fetchFavorites]);

 const filteredFavorites = favoriteListings.filter((l) => {
 if (filterMode === 'all') return true;
 return l.mode === filterMode;
 });

 const totalValue = favoriteListings.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

 if (!user) {
 return (
 <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
 <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 ">
 <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
 <Heart className="w-8 h-8 fill-rose-100 text-rose-500" />
 </div>
 <h2 className="text-xl sm:text-2xl font-black text-slate-900">Sign in to see your Wishlist</h2>
 <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
 Save items and services you love, track local price drops, and pick up right where you left off across all your devices.
 </p>
 <div className="pt-2">
 <button
 onClick={() => openAuthModal('login')}
 className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition"
 >
 Log In / Register
 </button>
 </div>
 <Link
 to="/market"
 className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline font-semibold"
 >
 <Compass className="w-3.5 h-3.5" />
 <span>Continue browsing as guest</span>
 </Link>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-slate-50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
 <div className="max-w-7xl mx-auto space-y-6">
 {/* Header Banner */}
 <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div className="space-y-1">
 <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
 <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
 <span>Your Saved Collection</span>
 </div>
 <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
 Favorites & Saved Deals
 </h1>
 <p className="text-xs sm:text-sm text-slate-500">
 {count} {count === 1 ? 'item saved' : 'items saved'} in your private wishlist. Tap the heart to remove any item.
 </p>
 </div>

 <div className="flex items-center gap-3">
 {totalValue > 0 && (
 <div className="hidden sm:flex flex-col items-end px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Value</span>
 <span className="text-sm font-black text-slate-900">₦{totalValue.toLocaleString()}</span>
 </div>
 )}
 <Link
 to="/market"
 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition"
 >
 <Compass className="w-4 h-4" />
 <span>Explore Market</span>
 </Link>
 </div>
 </div>

 {/* Filter Mode Pills (if items exist) */}
 {favoriteListings.length > 0 && (
 <div className="flex items-center gap-2 overflow-x-auto pb-1">
 {['all', 'second-hand', 'new', 'service'].map((m) => {
 const isSelected = filterMode === m;
 const countForMode = m === 'all' ? favoriteListings.length : favoriteListings.filter(l => l.mode === m).length;
 if (m !== 'all' && countForMode === 0) return null;
 return (
 <button
 key={m}
 onClick={() => setFilterMode(m)}
 className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer capitalize ${
 isSelected
 ? 'bg-slate-900 text-white '
 : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
 }`}
 >
 {m === 'all' ? 'All Items' : m === 'new' ? 'Brand-New' : m.replace('-', ' ')} ({countForMode})
 </button>
 );
 })}
 </div>
 )}

 {/* Content Section */}
 {loading ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
 {[1, 2, 3, 4, 5, 6].map((n) => (
 <div
 key={n}
 className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3 animate-pulse"
 >
 <div className="w-full aspect-square bg-slate-200 rounded-xl" />
 <div className="h-4 bg-slate-200 rounded w-1/2" />
 <div className="h-3 bg-slate-200 rounded w-3/4" />
 </div>
 ))}
 </div>
 ) : filteredFavorites.length === 0 ? (
 <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 sm:p-16 text-center max-w-xl mx-auto space-y-4 my-8">
 <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
 <ShoppingBag className="w-8 h-8" />
 </div>
 <h2 className="text-lg sm:text-xl font-bold text-slate-800">
 {favoriteListings.length === 0 ? 'Your wishlist is currently empty' : 'No items match this filter'}
 </h2>
 <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
 Explore oBuy and tap the heart on any item or local service to save it here for quick comparison and future visits.
 </p>
 <div className="pt-2">
 <Link
 to="/market"
 className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition"
 >
 <Compass className="w-4 h-4" />
 <span>Browse oBuy</span>
 <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
 {filteredFavorites.map((item) => (
 <ListingCard key={item._id} listing={item} />
 ))}
 </div>
 )}

 {/* Safety Note */}
 <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-900">
 <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
 <span>
 <strong>Safe Meetup Reminder:</strong> Favorited listings remain off-platform deals. Always inspect items in person and agree on terms before paying the seller.
 </span>
 </div>
 </div>
 </div>
 );
}
