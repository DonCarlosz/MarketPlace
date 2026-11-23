import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const ModeContext = createContext();

export const ModeProvider = ({ children }) => {
  // Modes: 'second-hand', 'new', 'service'
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('obuy_mode') || localStorage.getItem('marketplace_mode');
    return ['second-hand', 'new', 'service'].includes(saved) ? saved : 'second-hand';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [radiusKm, setRadiusKm] = useState('all');
  const [userLocation, setUserLocation] = useState({
    city: 'All Locations',
    coordinates: null,
  });

  useEffect(() => {
    localStorage.setItem('obuy_mode', mode);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      radiusKm,
      setRadiusKm,
      userLocation,
      setUserLocation,
    }),
    [mode, searchQuery, selectedCategory, radiusKm, userLocation]
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};

export const useMode = () => useContext(ModeContext);
