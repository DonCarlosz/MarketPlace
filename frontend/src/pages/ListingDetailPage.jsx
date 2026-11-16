import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/format';
import SafetyBanner from '../components/SafetyBanner';
import {
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  MessageCircle,
  Flag,
  Share2,
  ChevronLeft,
  Eye,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Wrench,
  AlertTriangle,
} from 'lucide-react';

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await API.get(`/listings/${id}`);
        if (res.data?.success) {
          setListing(res.data.listing);
        }
      } catch (err) {
        console.error('Error fetching listing details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  const handleStartChat = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    const currentUserId = (user?._id || user?.id)?.toString();
    const sellerId = (listing?.seller?._id || listing?.seller?.id || listing?.seller)?.toString();

    if (currentUserId && sellerId && currentUserId === sellerId) {
      alert("You cannot start a conversation with yourself on your own listing.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await API.post('/chat/conversations', { listingId: listing._id });
      if (res.data?.success && res.data.conversation?._id) {
        navigate(`/messages?conversationId=${res.data.conversation._id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to open chat');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    try {
      await API.post('/reports', {
        targetType: 'listing',
        targetId: listing._id,
        reason: reportReason,
        details: reportDetails,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportModalOpen(false);
        setReportSuccess(false);
        setReportDetails('');
      }, 2000);
    } catch (err) {
      alert('Failed to submit report.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-slate-800">Listing Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">This listing may have been sold or removed.</p>
        <Link to="/" className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl">
          Back to Browse
        </Link>
      </div>
    );
  }

  const images = listing.images?.length > 0
    ? listing.images.map((img) =>
        img.url.startsWith('http')
          ? img.url
          : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${img.url}`
      )
    : ['https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=1000&q=80'];

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <SafetyBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to listings</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Image Gallery & Description (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Image Gallery */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-3">
              <div className="aspect-[16/10] bg-slate-900 rounded-2xl overflow-hidden relative flex items-center justify-center">
                <img
                  src={images[selectedImageIndex]}
                  alt={listing.title}
                  className="w-full h-full object-contain"
                />

                {/* Mode Tag */}
                <div className="absolute top-3 left-3">
                  {listing.mode === 'new' && (
                    <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow">
                      <Sparkles className="w-3.5 h-3.5" /> Brand New
                    </span>
                  )}
                  {listing.mode === 'service' && (
                    <span className="inline-flex items-center gap-1 bg-purple-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow">
                      <Wrench className="w-3.5 h-3.5" /> Local Service
                    </span>
                  )}
                  {listing.mode === 'second-hand' && (
                    <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow">
                      <RefreshCw className="w-3.5 h-3.5" /> Second-hand
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                        selectedImageIndex === idx ? 'border-indigo-600 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description & Overview */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                  {listing.title}
                </h1>

                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {listing.location?.city}
                      {listing.location?.neighborhood ? `, ${listing.location?.neighborhood}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Posted {new Date(listing.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>{listing.views} views</span>
                  </div>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Category</span>
                  <span className="font-semibold text-slate-800">{listing.category}</span>
                </div>
                {listing.mode !== 'service' && (
                  <div>
                    <span className="text-slate-400 block font-medium">Condition</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {listing.condition?.replace('-', ' ')}
                    </span>
                  </div>
                )}
                {listing.mode === 'service' && listing.serviceType && (
                  <div>
                    <span className="text-slate-400 block font-medium">Service Type</span>
                    <span className="font-semibold text-slate-800">{listing.serviceType}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block font-medium">Payment Type</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {listing.priceType || 'Fixed (Off-platform)'}
                  </span>
                </div>
              </div>

              {/* Service Availability note if present */}
              {listing.availabilityNotes && (
                <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-2xl text-xs text-purple-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    Availability & Scheduling Notes:
                  </p>
                  <p>{listing.availabilityNotes}</p>
                </div>
              )}

              {/* Description body */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Description</h3>
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {listing.description}
                </p>
              </div>

              {/* Preferred Meetup Notes */}
              <div className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-2xl space-y-1.5">
                <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Seller/Provider's Preferred Meetup Guidelines
                </h4>
                <p className="text-xs text-emerald-800">
                  {listing.preferredMeetup ||
                    'Public meetup location (busy café, supermarket parking, mall, or designated safe zone).'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing, Contact & Trust Guidelines (1 col) */}
          <div className="space-y-6">
            {/* Price & Primary CTA Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Price</span>
                <div className="text-3xl font-black text-slate-900 mt-0.5">
                  {formatPrice(listing.price, listing.priceType)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pay seller directly (cash or local bank transfer) upon in-person meetup & inspection.
                </p>
              </div>

              <button
                onClick={handleStartChat}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-2xl shadow-sm shadow-indigo-100 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {actionLoading
                    ? 'Connecting...'
                    : listing.mode === 'service'
                    ? 'Message Provider to Book'
                    : 'Message Seller to Meet'}
                </span>
              </button>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-600 transition"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report listing</span>
                </button>

                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Seller / Provider Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {listing.mode === 'service' ? 'About the Provider' : 'About the Seller'}
              </h4>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-base flex items-center justify-center border border-indigo-200 shrink-0">
                  {listing.seller?.avatar ? (
                    <img
                      src={listing.seller.avatar}
                      alt={listing.seller.name}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    listing.seller?.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>

                <div>
                  <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    {listing.seller?.name || 'Local User'}
                    {listing.seller?.isVerified && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" title="Verified Member" />
                    )}
                  </h5>
                  <p className="text-xs text-slate-500">
                    Member since {listing.seller?.createdAt ? new Date(listing.seller.createdAt).getFullYear() : '2026'}
                  </p>
                </div>
              </div>

              {listing.seller?.bio && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  "{listing.seller.bio}"
                </p>
              )}
            </div>

            {/* Safety & Off-Platform Checklist */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Safe Deal Guidelines
              </h4>
              <ul className="text-xs text-amber-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span><strong>Inspect before paying:</strong> For items, check condition in-person before transferring cash or digital funds.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span><strong>Meet in public:</strong> Always choose busy cafés, shopping centers, or police station exchange zones.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span><strong>No wire deposits:</strong> Never send deposits via wire or gift cards prior to meeting.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Flag className="w-5 h-5 text-rose-500" />
              Report this Listing
            </h3>

            {reportSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-medium">
                Thank you. Your report has been submitted for review.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5"
                  >
                    <option value="spam">Spam or Duplicate</option>
                    <option value="fraud-scam">Suspected Fraud or Scam</option>
                    <option value="prohibited-item">Prohibited or Illegal Item/Service</option>
                    <option value="inappropriate-content">Inappropriate Content</option>
                    <option value="other">Other Violation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Details</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide additional context to help our moderators..."
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none"
                  ></textarea>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
