import React from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/format';
import { useFavorites } from '../context/FavoritesContext';
import { MapPin, Sparkles, RefreshCw, Wrench, Navigation, Heart } from 'lucide-react';

export default function ListingCard({ listing, compact = false }) {
  const { isFavorite, toggleFavorite } = useFavorites();

  if (!listing) return null;

  const {
    _id,
    title,
    price,
    priceType,
    mode,
    images,
    location,
    condition,
    serviceType,
    distanceKm,
    category,
  } = listing;

  const favorited = isFavorite(_id);

  const imageUrl =
    images && images.length > 0 && images[0]?.url
      ? images[0].url.startsWith('http')
        ? images[0].url
        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${images[0].url}`
      : 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80';

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(_id);
  };

  const getModeBadge = () => {
    if (mode === 'new') {
      return (
        <span className="inline-flex items-center gap-0.5 bg-emerald-600/90 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm">
          <Sparkles className="w-2.5 h-2.5" /> New
        </span>
      );
    }
    if (mode === 'service') {
      return (
        <span className="inline-flex items-center gap-0.5 bg-purple-600/90 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm">
          <Wrench className="w-2.5 h-2.5" /> Service
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 bg-indigo-600/90 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm">
        <RefreshCw className="w-2.5 h-2.5" /> Used
      </span>
    );
  };

  return (
    <Link
      to={`/listing/${_id}`}
      className="group flex flex-col bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200/90 hover:border-indigo-400 hover:shadow-md transition duration-200 relative select-none"
    >
      {/* Compact Image Container */}
      <div className="relative aspect-square sm:aspect-[4/3] bg-slate-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Mode badge top left */}
        <div className="absolute top-2 left-2 z-10">{getModeBadge()}</div>

        {/* eBay-style Floating Heart / Favorite button top right */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm backdrop-blur-sm border border-slate-200/60 transition active:scale-90"
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-150 ${
              favorited
                ? 'text-rose-500 fill-rose-500'
                : 'text-slate-600 hover:text-rose-500'
            }`}
          />
        </button>

        {/* Condition tag for physical items at bottom left of image */}
        {mode !== 'service' && condition && condition !== 'not-applicable' && (
          <span className="absolute bottom-2 left-2 z-10 bg-slate-900/80 text-white text-[8px] sm:text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
            {condition.replace('-', ' ')}
          </span>
        )}
      </div>

      {/* Card Details Body */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-grow justify-between gap-1.5">
        {/* Prominent Price (eBay style: bold, top of details) */}
        <div>
          <div className="font-black text-slate-900 text-sm sm:text-base leading-tight">
            {formatPrice(price, priceType)}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-slate-800 text-xs sm:text-sm line-clamp-2 mt-1 group-hover:text-indigo-600 transition leading-snug">
            {title}
          </h3>
        </div>

        {/* Sub-info / Category */}
        <div className="text-[11px] text-slate-400 truncate">
          {mode === 'service' && serviceType ? (
            <span className="text-purple-600 font-medium">{serviceType}</span>
          ) : (
            category || 'Community Listing'
          )}
        </div>

        {/* Location & Distance Footer */}
        <div className="pt-2 mt-auto flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 gap-1.5">
          <div className="flex items-center gap-1 min-w-0 truncate">
            <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="truncate font-medium">{location?.city || 'Local'}</span>
          </div>

          {distanceKm !== undefined && distanceKm !== null && (
            <div className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
              <Navigation className="w-2.5 h-2.5 text-indigo-500" />
              <span>{distanceKm === 0 ? 'Same town' : `${distanceKm} km`}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
