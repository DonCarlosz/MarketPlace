// Nigerian cities & towns gazetteer with exact [longitude, latitude] coordinates
export const NIGERIAN_CITIES = {
  // Edo State
  uromi: { city: 'Uromi', state: 'Edo', coordinates: [6.3249, 6.7112] },
  ekpoma: { city: 'Ekpoma', state: 'Edo', coordinates: [6.1437, 6.7441] },
  auchi: { city: 'Auchi', state: 'Edo', coordinates: [6.2676, 7.0688] },
  'benin city': { city: 'Benin City', state: 'Edo', coordinates: [5.6037, 6.335] },
  benin: { city: 'Benin City', state: 'Edo', coordinates: [5.6037, 6.335] },

  // Delta State
  abraka: { city: 'Abraka', state: 'Delta', coordinates: [6.1042, 5.7904] },
  warri: { city: 'Warri', state: 'Delta', coordinates: [5.7501, 5.5167] },
  asaba: { city: 'Asaba', state: 'Delta', coordinates: [6.7333, 6.1833] },
  sapele: { city: 'Sapele', state: 'Delta', coordinates: [5.6769, 5.8941] },
  ughelli: { city: 'Ughelli', state: 'Delta', coordinates: [5.9989, 5.5003] },
  agbor: { city: 'Agbor', state: 'Delta', coordinates: [6.1833, 6.25] },

  // Lagos
  lagos: { city: 'Lagos', state: 'Lagos', coordinates: [3.3792, 6.5244] },
  ikeja: { city: 'Ikeja', state: 'Lagos', coordinates: [3.3515, 6.6018] },
  lekki: { city: 'Lekki', state: 'Lagos', coordinates: [3.5852, 6.4698] },
  yaba: { city: 'Yaba', state: 'Lagos', coordinates: [3.3784, 6.5095] },
  surulere: { city: 'Surulere', state: 'Lagos', coordinates: [3.3581, 6.4969] },
  victoria_island: { city: 'Victoria Island', state: 'Lagos', coordinates: [3.4246, 6.4281] },

  // Abuja (FCT)
  abuja: { city: 'Abuja', state: 'FCT', coordinates: [7.4951, 9.0579] },
  garki: { city: 'Garki', state: 'FCT', coordinates: [7.4891, 9.0272] },
  wuse: { city: 'Wuse', state: 'FCT', coordinates: [7.4643, 9.0645] },
  maitama: { city: 'Maitama', state: 'FCT', coordinates: [7.4984, 9.0882] },

  // South-South & South-East
  'port harcourt': { city: 'Port Harcourt', state: 'Rivers', coordinates: [7.0498, 4.8156] },
  enugu: { city: 'Enugu', state: 'Enugu', coordinates: [7.5105, 6.4584] },
  nsukka: { city: 'Nsukka', state: 'Enugu', coordinates: [7.3958, 6.8567] },
  awka: { city: 'Awka', state: 'Anambra', coordinates: [7.0723, 6.2209] },
  onitsha: { city: 'Onitsha', state: 'Anambra', coordinates: [6.7865, 6.1511] },
  owerri: { city: 'Owerri', state: 'Imo', coordinates: [7.0333, 5.4833] },
  aba: { city: 'Aba', state: 'Abia', coordinates: [7.3667, 5.1167] },
  calabar: { city: 'Calabar', state: 'Cross River', coordinates: [8.3417, 4.9757] },
  uyo: { city: 'Uyo', state: 'Akwa Ibom', coordinates: [7.9322, 5.0377] },
  yenagoa: { city: 'Yenagoa', state: 'Bayelsa', coordinates: [6.2642, 4.9267] },

  // South-West
  ibadan: { city: 'Ibadan', state: 'Oyo', coordinates: [3.947, 7.3775] },
  abeokuta: { city: 'Abeokuta', state: 'Ogun', coordinates: [3.35, 7.15] },
  akure: { city: 'Akure', state: 'Ondo', coordinates: [5.195, 7.2526] },
  osogbo: { city: 'Osogbo', state: 'Osun', coordinates: [4.556, 7.771] },
  'ado ekiti': { city: 'Ado Ekiti', state: 'Ekiti', coordinates: [5.2209, 7.6233] },

  // North
  bauchi: { city: 'Bauchi', state: 'Bauchi', coordinates: [9.8439, 10.3103] },
  kano: { city: 'Kano', state: 'Kano', coordinates: [8.5167, 12.0] },
  kaduna: { city: 'Kaduna', state: 'Kaduna', coordinates: [7.4408, 10.5105] },
  jos: { city: 'Jos', state: 'Plateau', coordinates: [8.8921, 9.8965] },
  ilorin: { city: 'Ilorin', state: 'Kwara', coordinates: [4.5418, 8.4966] },
  maiduguri: { city: 'Maiduguri', state: 'Borno', coordinates: [13.151, 11.8311] },
  sokoto: { city: 'Sokoto', state: 'Sokoto', coordinates: [5.239, 13.0622] },
  zaria: { city: 'Zaria', state: 'Kaduna', coordinates: [7.7227, 11.0855] },
  makurdi: { city: 'Makurdi', state: 'Benue', coordinates: [8.5391, 7.7337] },
  minna: { city: 'Minna', state: 'Niger', coordinates: [6.5569, 9.6139] },
  lokoja: { city: 'Lokoja', state: 'Kogi', coordinates: [6.7333, 7.8] },
  yola: { city: 'Yola', state: 'Adamawa', coordinates: [12.4833, 9.2] },
  gombe: { city: 'Gombe', state: 'Gombe', coordinates: [11.1673, 10.2897] },
};

// Resolve city text into standard [longitude, latitude]
export const resolveCityCoordinates = (cityName) => {
  if (!cityName || typeof cityName !== 'string') return [3.3792, 6.5244];
  const normalized = cityName.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');

  for (const [key, data] of Object.entries(NIGERIAN_CITIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return data.coordinates;
    }
  }

  return [3.3792, 6.5244];
};

// Haversine formula to calculate true distance between two points in kilometers
export const calculateDistanceKm = (lon1, lat1, lon2, lat2) => {
  if (
    lon1 === undefined ||
    lat1 === undefined ||
    lon2 === undefined ||
    lat2 === undefined ||
    (lon1 === 0 && lat1 === 0) ||
    (lon2 === 0 && lat2 === 0)
  ) {
    return null;
  }

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};
