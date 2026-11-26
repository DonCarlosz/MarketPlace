import React, { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/format';
import { useFavorites } from '../context/FavoritesContext';
import { resolveMediaUrl } from '../services/api';
import { hapticTap } from '../utils/haptics';
import {
  MapPin,
  Sparkles,
  RefreshCw,
  Wrench,
  Navigation,
  Heart,
  ChevronRight,
  CheckCircle2,
  Clock,
  MoreVertical,
  Trash2,
  RotateCcw,
  Edit3,
} from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=75';

const ListingCard = memo(function ListingCard({ listing, layout = 'grid', ownerActions = null }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);

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
    seller,
    createdAt,
  } = listing;

  const favorited = isFavorite(_id);
  const imageUrl =
    images && images.length > 0 && images[0]?.url
      ? resolveMediaUrl(images[0].url, FALLBACK_IMAGE)
      : FALLBACK_IMAGE;

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    hapticTap();
    toggleFavorite(_id);
  };

  const getModeBadge = () => {
    if (mode === 'new') {
      return (
        <span className="inline-flex items-center gap-0.5 bg-emerald-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded">
          <Sparkles className="w-2.5 h-2.5" /> New
        </span>
      );
    }
    if (mode === 'service') {
      return (
        <span className="inline-flex items-center gap-0.5 bg-amber-700 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded">
          <Wrench className="w-2.5 h-2.5" /> Service
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 bg-brand-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded">
        <RefreshCw className="w-2.5 h-2.5" /> Used
      </span>
    );
  };

  // Horizontal List View Layout
  if (layout === 'list') {
    return (
      <Link
        to={`/listing/${_id}`}
        className="listing-card-item group flex flex-col sm:flex-row sm:h-44 bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-slate-300 transition-colors duration-150 relative select-none"
      >
        <div className="relative w-full sm:w-48 h-44 bg-slate-100 overflow-hidden shrink-0">
          <img
            src={imageUrl}
            alt={title}
            onError={(e) => {
              if (e.currentTarget.src !== FALLBACK_IMAGE) {
                e.currentTarget.src = FALLBACK_IMAGE;
              }
            }}
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
          />

          <div className="absolute top-2 left-2 z-10">{getModeBadge()}</div>

          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            className="absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center border border-slate-200 transition-transform active:scale-90 cursor-pointer"
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-150 ${
                favorited ? 'text-rose-500 fill-rose-500' : 'text-slate-600 hover:text-rose-500'
              }`}
            />
          </button>

          {mode !== 'service' && condition && condition !== 'not-applicable' && (
            <span className="absolute bottom-2 left-2 z-10 bg-slate-900/90 text-white text-[8px] sm:text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded">
              {condition.replace('-', ' ')}
            </span>
          )}
        </div>

        <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>{category || 'Community Listing'}</span>
              {createdAt && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(createdAt).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>

            <h3 className="font-bold text-slate-900 text-sm sm:text-base transition-colors leading-snug mt-1 line-clamp-2">
              {title}
            </h3>

            {seller?.name && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                <span>
                  Sold by <strong>{seller.name}</strong>
                </span>
                {seller.isVerified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" title="Verified Seller" />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{location?.city || 'Local Area'}</span>
            </div>

            {distanceKm !== undefined && distanceKm !== null && (
              <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                <Navigation className="w-2.5 h-2.5 text-slate-500" />
                <span>{distanceKm === 0 ? 'Same town' : `${distanceKm} km away`}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-3.5 sm:p-4 sm:border-l border-t sm:border-t-0 border-slate-100 sm:w-44 shrink-0 flex sm:flex-col justify-between items-center sm:items-end bg-slate-50/50">
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Price
            </span>
            <div className="font-black text-slate-900 text-base sm:text-lg leading-tight mt-0.5">
              {formatPrice(price, priceType)}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              Direct In-Person Deal
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-transform">
            <span>View</span>
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </Link>
    );
  }

  // Standard Compact Grid Card Layout (strict fixed height per breakpoint with tight photo-to-text proportions and zero dead whitespace)
  return (
    <Link
      to={`/listing/${_id}`}
      className={`${ownerActions ? '' : 'listing-card-item '}group flex flex-col w-full h-[268px] sm:h-[304px] bg-white rounded-xl sm:rounded-2xl ${
        ownerActions ? 'overflow-visible' : 'overflow-hidden'
      } ${ownerMenuOpen ? 'z-30' : ''} border border-slate-200/90 hover:border-slate-300 transition-colors duration-150 relative select-none`}
    >
      <div className="relative w-full h-[154px] sm:h-[182px] shrink-0 bg-slate-100 rounded-t-xl sm:rounded-t-2xl">
        <div className="absolute inset-0 rounded-t-xl sm:rounded-t-2xl overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            onError={(e) => {
              if (e.currentTarget.src !== FALLBACK_IMAGE) {
                e.currentTarget.src = FALLBACK_IMAGE;
              }
            }}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="absolute top-2 left-2 z-10">{getModeBadge()}</div>

        {ownerActions ? (
          <div
            className="absolute top-2 right-2 z-20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOwnerMenuOpen((prev) => !prev);
              }}
              aria-label="Listing options"
              title="Listing options"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-700 transition-transform active:scale-90 cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {ownerMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOwnerMenuOpen(false);
                  }}
                />
                <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl border border-slate-200 py-1 z-30">
                  {ownerActions.onEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOwnerMenuOpen(false);
                        ownerActions.onEdit?.();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 text-left whitespace-nowrap transition-colors cursor-pointer border-b border-slate-100"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Edit Listing</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOwnerMenuOpen(false);
                      ownerActions.onToggleStatus?.();
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-bold text-left whitespace-nowrap transition-colors cursor-pointer ${
                      ownerActions.isActive
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {ownerActions.isActive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{mode === 'service' ? 'Mark Done' : 'Mark Sold'}</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        <span>Reactivate</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOwnerMenuOpen(false);
                      ownerActions.onDelete?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 text-left whitespace-nowrap transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            className="absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center border border-slate-200 transition-transform active:scale-90 cursor-pointer"
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-150 ${
                favorited ? 'text-rose-500 fill-rose-500' : 'text-slate-600 hover:text-rose-500'
              }`}
            />
          </button>
        )}

        {mode !== 'service' && condition && condition !== 'not-applicable' && (
          <span className="absolute bottom-2 left-2 z-10 bg-slate-900/90 text-white text-[8px] sm:text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded">
            {condition.replace('-', ' ')}
          </span>
        )}
      </div>

      <div className="px-2.5 py-2 sm:px-3 sm:py-2.5 flex flex-col flex-1 min-h-0 justify-between overflow-hidden">
        <div className="min-w-0">
          <div className="font-black text-slate-900 text-sm sm:text-[15px] leading-tight truncate">
            {formatPrice(price, priceType)}
          </div>

          <h3 className="font-semibold text-slate-800 text-xs sm:text-[13px] line-clamp-2 mt-0.5 group-hover:text-slate-950 transition-colors leading-snug">
            {title}
          </h3>

          <div className="text-[10.5px] sm:text-[11px] text-slate-400 truncate mt-0.5">
            {mode === 'service' && serviceType ? (
              <span className="text-amber-700 font-medium">{serviceType}</span>
            ) : (
              category || 'Community Listing'
            )}
          </div>
        </div>

        <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 gap-1.5 shrink-0">
          <div className="flex items-center gap-1 min-w-0 truncate">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{location?.city || 'Local'}</span>
          </div>

          {distanceKm !== undefined && distanceKm !== null && (
            <div className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
              <Navigation className="w-2.5 h-2.5 text-slate-400" />
              <span>{distanceKm === 0 ? 'Same town' : `${distanceKm} km`}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});

export default ListingCard;
