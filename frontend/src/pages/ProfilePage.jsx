import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';
import ConfirmModal from '../components/ConfirmModal';
import {
  User,
  MapPin,
  Mail,
  Edit3,
  Check,
  Package,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Plus,
} from 'lucide-react';

// Global cache for instant profile listings return
let profileListingsCache = null;

export default function ProfilePage() {
  const { user, updateUser, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [myListings, setMyListings] = useState(() => profileListingsCache || []);
  const [loading, setLoading] = useState(() => !profileListingsCache);
  const [tab, setTab] = useState('active'); // 'active' | 'sold'
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.location?.city || '');
  const [saveLoading, setSaveLoading] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'danger',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (!user) {
      openAuthModal('login');
      navigate('/');
      return;
    }

    const fetchMyListings = async () => {
      try {
        const res = await API.get('/listings/user/my-listings');
        if (res.data?.success) {
          const fresh = res.data.listings || [];
          profileListingsCache = fresh;
          setMyListings(fresh);
        }
      } catch (err) {
        console.error('Failed to load user listings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyListings();
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await API.put('/auth/me', { name, bio, city });
      if (res.data?.success) {
        updateUser(res.data.user);
        setEditing(false);
      }
    } catch (err) {
      alert('Failed to update profile.');
    } finally {
      setSaveLoading(false);
    }
  };

  const promptToggleStatus = (listingId, newStatus, mode) => {
    const isDeactivating = newStatus === 'sold' || newStatus === 'completed';
    setConfirmModalConfig({
      isOpen: true,
      title: isDeactivating
        ? `Mark as ${mode === 'service' ? 'Completed' : 'Sold'}?`
        : 'Reactivate Listing?',
      message: isDeactivating
        ? 'This listing will be marked as finished and will no longer appear in the active marketplace feed.'
        : 'This listing will be placed back onto the active public feed so buyers nearby can discover it.',
      confirmText: isDeactivating ? `Mark as ${mode === 'service' ? 'Completed' : 'Sold'}` : 'Reactivate',
      variant: 'primary',
      onConfirm: async () => {
        try {
          const res = await API.patch(`/listings/${listingId}/status`, { status: newStatus });
          if (res.data?.success) {
            setMyListings((prev) =>
              prev.map((item) => (item._id === listingId ? { ...item, status: newStatus } : item))
            );
          }
        } catch (err) {
          alert('Failed to update listing status');
        } finally {
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const promptDeleteListing = (listingId) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete this listing?',
      message: 'Are you sure you want to delete this listing? It will be permanently removed from your profile and the marketplace.',
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await API.delete(`/listings/${listingId}`);
          if (res.data?.success) {
            setMyListings((prev) => prev.filter((item) => item._id !== listingId));
          }
        } catch (err) {
          alert('Failed to delete listing');
        } finally {
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const activeListings = myListings.filter((l) => l.status === 'active');
  const pastListings = myListings.filter((l) => l.status === 'sold' || l.status === 'completed');

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Subtle Accent Header Banner */}
          <div className="h-24 sm:h-28 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 relative">
            <div className="absolute top-3 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold border border-white/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Verified Local Member</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 -mt-12 sm:-mt-14 relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-indigo-600 text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-lg border-4 border-white shrink-0">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="pb-1">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-1.5">
                    <span>{user?.name}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  </h1>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {user?.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      {user?.location?.city || 'Local Area'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{editing ? 'Cancel Editing' : 'Edit Profile'}</span>
              </button>
            </div>

            {/* Quick Stats Strip */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <div>
                <span className="text-lg sm:text-xl font-black text-slate-900">{activeListings.length}</span>
                <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Deals</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-lg sm:text-xl font-black text-slate-900">{pastListings.length}</span>
                <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
              </div>
              <div>
                <span className="text-lg sm:text-xl font-black text-indigo-600">0%</span>
                <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Platform Fees</span>
              </div>
            </div>

            {editing ? (
              <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City / Region</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Short Bio</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Introduce yourself to neighbors and prospective clients..."
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            ) : user?.bio ? (
              <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
                <p className="italic">"{user.bio}"</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Listings Tabs */}
        <div>
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setTab('active')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                tab === 'active'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Active Listings ({activeListings.length})</span>
            </button>
            <button
              onClick={() => setTab('sold')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                tab === 'sold'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Sold / Completed ({pastListings.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {loading ? (
              <div className="text-center py-12 text-xs text-slate-400">Loading your listings...</div>
            ) : (tab === 'active' ? activeListings : pastListings).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-4 max-w-md mx-auto my-6">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-800">No {tab} listings</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    {tab === 'active'
                      ? "You don't have any active items or services published yet. Reach local buyers in minutes!"
                      : 'Listings you mark as sold or completed will appear here for your records.'}
                  </p>
                </div>
                {tab === 'active' && (
                  <div className="pt-2">
                    <Link
                      to="/create"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Post a Listing</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {(tab === 'active' ? activeListings : pastListings).map((listing) => (
                  <div key={listing._id} className="relative group">
                    <ListingCard listing={listing} />
                    <div className="mt-2 flex items-center justify-between gap-2 px-1">
                      {tab === 'active' ? (
                        <button
                          onClick={() =>
                            promptToggleStatus(
                              listing._id,
                              listing.mode === 'service' ? 'completed' : 'sold',
                              listing.mode
                            )
                          }
                          className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                        >
                          Mark as {listing.mode === 'service' ? 'Completed' : 'Sold'}
                        </button>
                      ) : (
                        <button
                          onClick={() => promptToggleStatus(listing._id, 'active', listing.mode)}
                          className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition"
                        >
                          Reactivate
                        </button>
                      )}

                      <button
                        onClick={() => promptDeleteListing(listing._id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        variant={confirmModalConfig.variant}
      />
    </div>
  );
}
