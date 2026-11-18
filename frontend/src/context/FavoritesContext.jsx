import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const { user, openAuthModal } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [favoriteListings, setFavoriteListings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sync favorite IDs when user object updates
  useEffect(() => {
    if (user && Array.isArray(user.favorites)) {
      setFavoriteIds(new Set(user.favorites.map((f) => (typeof f === 'string' ? f : f._id || f.id))));
    } else if (!user) {
      setFavoriteIds(new Set());
      setFavoriteListings([]);
    }
  }, [user]);

  // Fetch full listings for the Favorites page with zero-wait background revalidation
  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    if (favoriteListings.length === 0) {
      setLoading(true);
    }
    try {
      const res = await API.get('/listings/user/favorites');
      if (res.data?.success) {
        const items = res.data.listings || [];
        setFavoriteListings(items);
        setFavoriteIds(new Set(items.map((item) => item._id)));
      }
    } catch (err) {
      console.error('Failed to fetch favorite listings:', err);
    } finally {
      setLoading(false);
    }
  }, [user, favoriteListings.length]);

  // Check if a specific listing is favorited
  const isFavorite = useCallback(
    (listingId) => {
      if (!listingId) return false;
      return favoriteIds.has(listingId.toString());
    },
    [favoriteIds]
  );

  // Toggle favorite on an item
  const toggleFavorite = useCallback(
    async (listingId) => {
      if (!user) {
        openAuthModal('login');
        return false;
      }

      if (!listingId) return false;
      const strId = listingId.toString();
      const wasFav = favoriteIds.has(strId);

      // Optimistic update
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFav) {
          next.delete(strId);
        } else {
          next.add(strId);
        }
        return next;
      });

      if (wasFav) {
        setFavoriteListings((prev) => prev.filter((item) => item._id !== strId));
      }

      try {
        const res = await API.post(`/listings/${strId}/favorite`);
        if (res.data?.success && Array.isArray(res.data.favorites)) {
          setFavoriteIds(new Set(res.data.favorites.map((f) => f.toString())));
        }
        return !wasFav;
      } catch (err) {
        // Rollback on failure
        console.error('Failed to toggle favorite:', err);
        setFavoriteIds((prev) => {
          const rollback = new Set(prev);
          if (wasFav) rollback.add(strId);
          else rollback.delete(strId);
          return rollback;
        });
        return wasFav;
      }
    },
    [user, favoriteIds, openAuthModal]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favoriteListings,
        isFavorite,
        toggleFavorite,
        fetchFavorites,
        loading,
        count: favoriteIds.size,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
