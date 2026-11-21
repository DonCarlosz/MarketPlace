import React, { createContext, useContext, useState, useEffect } from 'react';

const ModeContext = createContext();

export const ModeProvider = ({ children }) => {
 // Modes: 'second-hand', 'new', 'service'
 const [mode, setMode] = useState(() => {
 return localStorage.getItem('marketplace_mode') || 'second-hand';
 });

 const [searchQuery, setSearchQuery] = useState('');
 const [selectedCategory, setSelectedCategory] = useState('all');
 const [radiusKm, setRadiusKm] = useState('all'); // 'all' (default, displays all listings) or 5, 15, 25, 50, 100
 const [userLocation, setUserLocation] = useState({
 city: 'All Locations',
 coordinates: null, // [longitude, latitude]
 });

 // Persist mode choice
 useEffect(() => {
 localStorage.setItem('marketplace_mode', mode);
 }, [mode]);

 return (
 <ModeContext.Provider
 value={{
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
 }}
 >
 {children}
 </ModeContext.Provider>
 );
};

export const useMode = () => useContext(ModeContext);
