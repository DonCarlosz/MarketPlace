import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMode } from '../context/ModeContext';
import {
  Upload,
  X,
  Plus,
  RefreshCw,
  Sparkles,
  Wrench,
  ShieldAlert,
  MapPin,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

const CATEGORIES_BY_MODE = {
  'second-hand': [
    'Electronics',
    'Furniture',
    'Vehicles',
    'Clothing & Shoes',
    'Home & Garden',
    'Sports & Outdoors',
    'Collectibles',
    'Tools',
    'Books & Games',
    'Other',
  ],
  new: [
    'Electronics',
    'Fashion & Apparel',
    'Home Decor',
    'Beauty & Personal Care',
    'Fitness & Gear',
    'Gadgets & Tech',
    'Handmade & Crafts',
    'Groceries & Snacks',
    'Other',
  ],
  service: [
    'Barbers & Hair',
    'Nail & Lash Techs',
    'Photography & Video',
    'Home Repair & Handyman',
    'Tutors & Lessons',
    'House Cleaning',
    'Auto Detailing & Mechanics',
    'Events & Catering',
    'Personal Trainers',
    'Other',
  ],
};

export default function CreateListingPage() {
  const { user, openAuthModal } = useAuth();
  const { mode: defaultMode, userLocation } = useMode();
  const navigate = useNavigate();

  const [mode, setMode] = useState(defaultMode || 'second-hand');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState('fixed');
  const [category, setCategory] = useState(CATEGORIES_BY_MODE[mode][0]);
  const [condition, setCondition] = useState('good');
  const [serviceType, setServiceType] = useState('');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [city, setCity] = useState(user?.location?.city || userLocation.city || '');
  const [neighborhood, setNeighborhood] = useState(user?.location?.neighborhood || '');
  const [preferredMeetup, setPreferredMeetup] = useState(
    'Safe public location (café, shopping mall, or police station exchange spot).'
  );

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign in to Post a Listing</h2>
          <p className="text-xs text-slate-500">
            You need a verified account to create listings and communicate with local buyers and clients.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => openAuthModal('login')}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              Log In
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setCategory(CATEGORIES_BY_MODE[newMode][0]);
    setPriceType('fixed');
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (images.length + files.length > 6) {
      alert('You can upload a maximum of 6 photos.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    try {
      const res = await API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data.images) {
        setImages((prev) => [...prev, ...res.data.images]);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      // Fallback: create local object URL previews for presentation if backend upload endpoint is offline
      const fallbackUrls = files.map((file) => ({
        url: URL.createObjectURL(file),
      }));
      setImages((prev) => [...prev, ...fallbackUrls]);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!termsAgreed) {
      setError('Please acknowledge the off-platform safety and zero-liability terms.');
      return;
    }

    if (!title.trim() || !description.trim() || price === '' || !city.trim()) {
      setError('Please fill in all required fields (title, description, price, and city).');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        mode,
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        priceType,
        category,
        condition: mode === 'service' ? 'not-applicable' : condition,
        serviceType: mode === 'service' ? serviceType.trim() : undefined,
        availabilityNotes: mode === 'service' ? availabilityNotes.trim() : undefined,
        images: images.map((img) => ({ url: img.url })),
        city: city.trim(),
        neighborhood: neighborhood.trim(),
        preferredMeetup: preferredMeetup.trim(),
      };

      const res = await API.post('/listings', payload);

      if (res.data?.success && res.data.listing?._id) {
        navigate(`/listing/${res.data.listing._id}`);
      }
    } catch (err) {
      console.error('Failed to create listing:', err);
      setError(err.response?.data?.message || 'Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Create a Listing</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Publish items or local services for neighbors in your area. Zero platform transaction fees.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Mode Selection */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Select Listing Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleModeChange('second-hand')}
                className={`p-4 rounded-2xl border-2 text-left transition ${
                  mode === 'second-hand'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <RefreshCw className="w-5 h-5 text-indigo-600 mb-2" />
                <h4 className="text-sm font-bold">Second-hand</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Used goods, electronics, furniture, clothing</p>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('new')}
                className={`p-4 rounded-2xl border-2 text-left transition ${
                  mode === 'new'
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Sparkles className="w-5 h-5 text-emerald-600 mb-2" />
                <h4 className="text-sm font-bold">New Items</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Brand-new, boxed or handmade items</p>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('service')}
                className={`p-4 rounded-2xl border-2 text-left transition ${
                  mode === 'service'
                    ? 'border-purple-600 bg-purple-50/50 text-purple-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Wrench className="w-5 h-5 text-purple-600 mb-2" />
                <h4 className="text-sm font-bold">Services</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Barbers, nail artists, photography, tutoring</p>
              </button>
            </div>
          </div>

          {/* Step 2: Listing Details */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Listing Details
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  mode === 'service'
                    ? 'e.g., Professional Studio & Outdoor Photography'
                    : 'e.g., Apple iPhone 13 Pro 128GB - Graphite'
                }
                maxLength={100}
                required
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 bg-white focus:outline-none"
                >
                  {CATEGORIES_BY_MODE[mode].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {mode !== 'service' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Condition <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 bg-white focus:outline-none"
                  >
                    {mode === 'new' ? (
                      <option value="brand-new">Brand New (Unopened/Original)</option>
                    ) : (
                      <>
                        <option value="like-new">Like New (Mint)</option>
                        <option value="good">Good (Lightly used)</option>
                        <option value="fair">Fair (Noticeable wear)</option>
                        <option value="for-parts">For Parts / Not working</option>
                      </>
                    )}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specific Skill / Specialty
                  </label>
                  <input
                    type="text"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    placeholder="e.g., Fade haircut, Gel nails, Math tutoring"
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Price (₦) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g., 25000 (0 for Free/Quote)"
                  required
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Price Structure</label>
                <select
                  value={priceType}
                  onChange={(e) => setPriceType(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 bg-white focus:outline-none cursor-pointer"
                >
                  <option value="fixed">Fixed Price</option>
                  <option value="negotiable">Negotiable</option>
                  <option value="starting-at">Starting At Base Fee</option>
                  <option value="hourly">Hourly Rate</option>
                  <option value="free">Free / Contact for Quote</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include key details, specifications, usage history, or service scope..."
                required
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none"
              ></textarea>
            </div>

            {mode === 'service' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Availability / Booking Notes
                </label>
                <input
                  type="text"
                  value={availabilityNotes}
                  onChange={(e) => setAvailabilityNotes(e.target.value)}
                  placeholder="e.g., Weekends & evenings only; client supplies equipment"
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Step 3: Photos Upload */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Photos (Up to 6)
              </label>
              <span className="text-xs text-slate-400">{images.length}/6 photos added</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {images.map((img, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group"
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {img.sizeKb && (
                    <span className="absolute bottom-1 left-1 bg-emerald-700/85 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow backdrop-blur-sm">
                      {img.sizeKb} KB
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-slate-900/70 text-white rounded-full hover:bg-rose-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {images.length < 6 && (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 hover:bg-indigo-50/30">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-500 font-medium">
                    {uploading ? 'Uploading...' : 'Add Photo'}
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Step 4: Location & Safe Meetup Preferences */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              4. Location & Meetup Notes
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City / Town <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="nigerian-cities-list"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Uromi, Abraka, Benin City, Lagos"
                  required
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none"
                />
                <datalist id="nigerian-cities-list">
                  <option value="Uromi" />
                  <option value="Abraka" />
                  <option value="Ekpoma" />
                  <option value="Benin City" />
                  <option value="Warri" />
                  <option value="Asaba" />
                  <option value="Auchi" />
                  <option value="Lagos" />
                  <option value="Abuja" />
                  <option value="Port Harcourt" />
                  <option value="Ibadan" />
                  <option value="Enugu" />
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Neighborhood (Optional)</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="e.g., Westside, Financial District"
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Meetup Guidelines
              </label>
              <input
                type="text"
                value={preferredMeetup}
                onChange={(e) => setPreferredMeetup(e.target.value)}
                placeholder="e.g., Meet outside Metro station or café between 10am-6pm"
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-none"
              />
            </div>
          </div>

          {/* Step 5: Trust & Zero-Liability Agreement */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <label htmlFor="terms" className="text-xs text-amber-900 leading-relaxed cursor-pointer">
                <strong>Platform Policy Agreement:</strong> I understand that this marketplace does not process
                money or provide escrow/shipping guarantees. All transactions, appointments, and payments take
                place directly off-platform between the parties. I agree to communicate respectfully and arrange
                safe, public meetups.
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-indigo-100 transition"
          >
            {submitting ? 'Publishing Listing...' : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
