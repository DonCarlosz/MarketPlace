import React from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/format';
import { MapPin, Sparkles, RefreshCw, Wrench, Navigation } from 'lucide-react';

export default function ListingCard({ listing }) {
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
  } = listing;

  const imageUrl =
    images && images.length > 0 && images[0]?.url
      ? images[0].url.startsWith('http')
        ? images[0].url
        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${images[0].url}`
      : 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80';

  const getModeBadge = () => {
    if (mode === 'new') {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm backdrop-blur-sm">
          <Sparkles className="w-3 h-3" /> New
        </span>
      );
    }
    if (mode === 'service') {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm backdrop-blur-sm">
          <Wrench className="w-3 h-3" /> Service
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm backdrop-blur-sm">
        <RefreshCw className="w-3 h-3" /> Second-hand
      </span>
    );
  };

  return (
    <Link
      to={`/listing/${_id}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-indigo-400 hover:shadow-lg transition duration-200"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          loading="lazy"
        />

        {/* Mode badge top left */}
        <div className="absolute top-2.5 left-2.5">{getModeBadge()}</div>

        {/* Condition tag for items */}
        {mode !== 'service' && condition && condition !== 'not-applicable' && (
          <span className="absolute bottom-2.5 left-2.5 bg-slate-900/80 text-white text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded backdrop-blur-sm">
            {condition.replace('-', ' ')}
          </span>
        )}

        {/* Real Naira price tag top right */}
        <div className="absolute top-2.5 right-2.5 bg-white/95 text-slate-900 font-extrabold text-xs sm:text-sm px-2.5 py-1 rounded-xl shadow-sm border border-slate-100 backdrop-blur-sm">
          {formatPrice(price, priceType)}
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-grow">
        <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-indigo-600 transition">
          {title}
        </h3>

        {mode === 'service' && serviceType ? (
          <p className="text-xs text-purple-600 font-semibold mt-0.5 truncate">{serviceType}</p>
        ) : (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{listing.category}</p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 gap-2">
          <div className="flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate font-medium">{location?.city || 'Local'}</span>
          </div>

          {/* Calculated Proximity Tag if known */}
          {distanceKm !== undefined && distanceKm !== null && (
            <div className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
              <Navigation className="w-2.5 h-2.5 text-indigo-500" />
              <span>{distanceKm === 0 ? 'Same town' : `${distanceKm} km`}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
