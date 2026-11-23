import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import API from '../services/api';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const { user, openAuthModal } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [favoriteListings, setFavoriteListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchedForUserRef = useRef(null);

  const userId = user?._id || user?.id || null;

  useEffect(() => {
    if (user && Array.isArray(user.favorites)) {
      setFavoriteIds(new Set(user.favorites.map((f) => (typeof f === 'string' ? f : f._id || f.id))));
    } else if (!user) {
      setFavoriteIds(new Set());
      setFavoriteListings([]);
      fetchedForUserRef.current = null;
    }
  }, [user]);

  const fetchFavorites = useCallback(async () => {
    if (!userId) return;
    // Only show skeleton on first load for this user; revisit updates silently in background
    if (fetchedForUserRef.current !== userId && favoriteListings.length === 0) {
      setLoading(true);
    }
    try {
      const res = await API.get('/listings/user/favorites');
      if (res.data?.success) {
        const items = res.data.listings || [];
        setFavoriteListings(items);
        setFavoriteIds(new Set(items.map((item) => item._id)));
        fetchedForUserRef.current = userId;
      }
    } catch (err) {
      console.error('Failed to fetch favorite listings:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, favoriteListings.length]);

  const isFavorite = useCallback(
    (listingId) => {
      if (!listingId) return false;
      return favoriteIds.has(listingId.toString());
    },
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    async (listingId) => {
      if (!userId) {
        openAuthModal('login');
        return false;
      }

      if (!listingId) return false;
      const strId = listingId.toString();
      const wasFav = favoriteIds.has(strId);

      // Optimistic update
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFav) next.delete(strId);
        else next.add(strId);
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
    [userId, favoriteIds, openAuthModal]
  );

  const value = useMemo(
    () => ({
      favoriteIds,
      favoriteListings,
      isFavorite,
      toggleFavorite,
      fetchFavorites,
      loading,
      count: favoriteIds.size,
    }),
    [favoriteIds, favoriteListings, isFavorite, toggleFavorite, fetchFavorites, loading]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => useContext(FavoritesContext);
