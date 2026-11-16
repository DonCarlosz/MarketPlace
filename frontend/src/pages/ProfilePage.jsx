import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
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
          setMyListings(res.data.listings || []);
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
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md shadow-indigo-100">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{user?.name}</h1>
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
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{editing ? 'Cancel Editing' : 'Edit Profile'}</span>
            </button>
          </div>

          {editing ? (
            <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-slate-100 space-y-4">
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
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
              >
                {saveLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : user?.bio ? (
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <p>"{user.bio}"</p>
            </div>
          ) : null}
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
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-2">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No {tab} listings</p>
                <p className="text-xs text-slate-400">
                  {tab === 'active'
                    ? "You don't have any active items or services published yet."
                    : 'Listings you mark as sold or completed will appear here.'}
                </p>
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
