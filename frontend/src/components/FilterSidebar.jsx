import React, { useState, useEffect } from 'react';
import { NIGERIAN_CITY_LIST } from '../utils/geo';
import {
  MapPin,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';

const PRICE_PRESETS = [
  { label: 'All Prices', min: '', max: '' },
  { label: 'Under ₦20,000', min: '', max: '20000' },
  { label: '₦20k - ₦50k', min: '20000', max: '50000' },
  { label: '₦50k - ₦150k', min: '50000', max: '150000' },
  { label: '₦150k - ₦500k', min: '150000', max: '500000' },
  { label: 'Above ₦500,000', min: '500000', max: '' },
];

const CONDITION_OPTIONS = [
  { id: 'all', label: 'Any Condition' },
  { id: 'brand-new', label: 'Brand New' },
  { id: 'like-new', label: 'Like New (Open Box)' },
  { id: 'good', label: 'Good (Lightly Used)' },
  { id: 'fair', label: 'Fair (Visible Wear)' },
];

const RADIUS_OPTIONS = [
  { id: 'all', label: 'Any Distance' },
  { id: '15', label: 'Within 15 km' },
  { id: '35', label: 'Within 35 km' },
  { id: '75', label: 'Within 75 km' },
  { id: '150', label: 'Within 150 km' },
];

export default function FilterSidebar({
  selectedCategory = 'All',
  mode = 'second-hand',
  priceFilter = { min: '', max: '' },
  onPriceChange,
  conditionFilter = 'all',
  onConditionChange,
  activeCity = 'All Locations',
  onCityChange,
  radiusKm = 'all',
  onRadiusChange,
  onResetAll,
  onClose,
  totalResults = 0,
}) {
  const [localMin, setLocalMin] = useState(priceFilter.min || '');
  const [localMax, setLocalMax] = useState(priceFilter.max || '');

  // Keep local inputs synchronized when Reset All clears priceFilter
  useEffect(() => {
    setLocalMin(priceFilter.min || '');
    setLocalMax(priceFilter.max || '');
  }, [priceFilter.min, priceFilter.max]);

  const handleApplyCustomPrice = (e) => {
    e.preventDefault();
    onPriceChange({ min: localMin, max: localMax });
  };

  const isPresetActive = (preset) => {
    return priceFilter.min === preset.min && priceFilter.max === preset.max;
  };

  const hasActiveFilters =
    (selectedCategory && selectedCategory !== 'All') ||
    priceFilter.min ||
    priceFilter.max ||
    conditionFilter !== 'all' ||
    radiusKm !== 'all' ||
    activeCity !== 'All Locations';

  return (
    <div
      className={`flex flex-col bg-white text-slate-800 ${
        onClose
          ? 'max-h-[80dvh] h-full min-h-0'
          : 'h-full rounded-3xl border border-slate-200/90 overflow-hidden'
      }`}
    >
      {/* Sidebar Header */}
      <div className="px-4 py-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-600" />
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
            Filters & Facets
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="lg:hidden p-1 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Filters Section */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 overscroll-contain">
        {/* 1. Price Range */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Price Range (₦)
          </h4>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRICE_PRESETS.map((preset) => {
              const active = isPresetActive(preset);
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setLocalMin(preset.min);
                    setLocalMax(preset.max);
                    onPriceChange({ min: preset.min, max: preset.max });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleApplyCustomPrice} className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              placeholder="Min ₦"
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 focus:outline-none focus:border-brand-600"
            />
            <span className="text-slate-300 text-xs">-</span>
            <input
              type="number"
              min="0"
              placeholder="Max ₦"
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 focus:outline-none focus:border-brand-600"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              Go
            </button>
          </form>
        </div>

        {/* 2. Item Condition */}
        {mode !== 'service' && (
          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Condition
            </h4>
            <div className="space-y-1.5">
              {CONDITION_OPTIONS.map((opt) => {
                const checked = conditionFilter === opt.id;
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1"
                  >
                    <input
                      type="radio"
                      name="condition"
                      checked={checked}
                      onChange={() => onConditionChange(opt.id)}
                      className="w-3.5 h-3.5 accent-slate-900 rounded-full border-slate-300 cursor-pointer"
                    />
                    <span className={checked ? 'font-bold text-slate-900' : 'font-medium'}>
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Location & Nigerian Cities */}
        <div className="border-t border-slate-100 pt-5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span>Town / Region</span>
          </h4>

          <select
            value={activeCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400 cursor-pointer mb-3"
          >
            {NIGERIAN_CITY_LIST.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
            Distance Radius
          </span>
          <div className="flex flex-wrap gap-1.5">
            {RADIUS_OPTIONS.map((r) => {
              const active = radiusKm.toString() === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onRadiusChange(r.id === 'all' ? 'all' : Number(r.id))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Direct In-Person Trust Callout */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-[11px] text-emerald-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Safe Local Trading</span>
          </div>
          <p className="text-emerald-700 leading-tight">
            Direct face-to-face meetups. Always inspect items in person before paying. Zero wire deposits.
          </p>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      {onClose && (
        <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onResetAll}
            className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-2/3 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold cursor-pointer"
          >
            Show {totalResults} {totalResults === 1 ? 'Listing' : 'Listings'}
          </button>
        </div>
      )}
    </div>
  );
}
