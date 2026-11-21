import { GoogleGenAI } from '@google/genai';
import Listing from '../models/Listing.js';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// Fallback verified open-space commercial hubs across major Nigerian commercial centers
const NIGERIAN_SAFE_HUBS = {
  lagos: [
    {
      name: 'Ikeja City Mall (ICM) Open Parking Plaza',
      address: 'Obafemi Awolowo Way, Alausa, Ikeja, Lagos',
      locationType: 'mall_entrance',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the open vehicle parking plaza right near the main entrance security booth. Well-lit, high foot-traffic, and easy vehicle pull-up for inspection.',
      lat: 6.6173,
      lng: 3.3582,
    },
    {
      name: 'Maryland Mall Open Forecourt',
      address: '350-360 Ikorodu Road, Maryland, Lagos',
      locationType: 'commercial_plaza',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet on the ground floor open concourse near the entrance security desk. Excellent visibility and security presence.',
      lat: 6.5726,
      lng: 3.3685,
    },
    {
      name: 'TotalEnergies Mega Station Forecourt (Yaba)',
      address: 'Herbert Macaulay Way / Commercial Avenue, Yaba, Lagos',
      locationType: 'fuel_station_forecourt',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet on the wide, illuminated forecourt near the convenience store entrance. Ample space for vehicle loading and physical inspection.',
      lat: 6.5095,
      lng: 3.3792,
    },
    {
      name: 'Prince Ebeano Supermarket Car Park',
      address: 'Admiralty Way, Lekki Phase 1, Lagos',
      locationType: 'supermarket_plaza',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the wide customer car park near the entrance security checkpoint. Ideal for large electronics or vehicle loading.',
      lat: 6.4474,
      lng: 3.4731,
    },
  ],
  abuja: [
    {
      name: 'Jabi Lake Mall Open Parking Plaza',
      address: 'Bala Sokoto Way, Jabi, Abuja',
      locationType: 'mall_entrance',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet at the main surface car park entrance facing the lake promenade. Security guards present and room for vehicle loading.',
      lat: 9.0765,
      lng: 7.4243,
    },
    {
      name: 'Market Square Supermarket Plaza (Wuse 2)',
      address: 'Adetokunbo Ademola Crescent, Wuse 2, Abuja',
      locationType: 'supermarket_plaza',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the open customer parking lot near the customer service entrance. Broad daylight visibility and security attendance.',
      lat: 9.0772,
      lng: 7.4798,
    },
    {
      name: 'NNPC Mega Station Forecourt (Central Area)',
      address: 'Olusegun Obasanjo Way, Central Business District, Abuja',
      locationType: 'fuel_station_forecourt',
      spaceTag: 'Open Space & CCTV Monitored',
      plainDescription: 'Meet in the open, paved forecourt near the convenience mart. Active commercial hub with round-the-clock lighting and security.',
      lat: 9.0543,
      lng: 7.4891,
    },
  ],
  'benin city': [
    {
      name: 'Market Square Supermarket Forecourt',
      address: 'Sapele Road, near Country Home Motel Junction, Benin City',
      locationType: 'supermarket_plaza',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the large paved customer parking area near the main entrance gate. Great open space for vehicle pull-up and bulky item inspection.',
      lat: 6.3156,
      lng: 5.6148,
    },
    {
      name: 'Kada Plaza Cinema & Retail Concourse',
      address: '111 Sapele Road, Benin City',
      locationType: 'mall_entrance',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet in the exterior concourse near the main entrance security scanner. Busy public commercial zone with high visibility.',
      lat: 6.3211,
      lng: 5.6192,
    },
    {
      name: 'TotalEnergies Station Forecourt (Uselu/Ugbowo)',
      address: 'Lagos-Benin Expressway, near UNIBEN Main Gate, Benin City',
      locationType: 'fuel_station_forecourt',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet on the wide open station forecourt near the mart. Safe, high foot-traffic zone with UNIBEN security nearby.',
      lat: 6.3985,
      lng: 5.6124,
    },
  ],
  ibadan: [
    {
      name: 'The Palms Shopping Mall Car Park (Ring Road)',
      address: 'MKO Abiola Way, Ring Road, Ibadan',
      locationType: 'mall_entrance',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the open surface parking lot near the Shoprite entrance. Ample space for vehicle loading and strong security presence.',
      lat: 7.3621,
      lng: 3.8647,
    },
    {
      name: 'Ventura Mall Open Concourse (Samonda)',
      address: 'Sango-Samonda Road, near UI Gate, Ibadan',
      locationType: 'commercial_plaza',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet on the wide entrance plaza near the main reception desk. High visibility and student/family traffic.',
      lat: 7.4285,
      lng: 3.8962,
    },
  ],
  'port harcourt': [
    {
      name: 'Port Harcourt Pleasure Park Open Concourse',
      address: 'Aba Road, Bori Camp, Port Harcourt',
      locationType: 'commercial_plaza',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet at the primary visitor reception plaza by the main gate security check. Clear open grounds with security personnel.',
      lat: 4.8389,
      lng: 7.0125,
    },
    {
      name: 'Market Square Supermarket Plaza (Peter Odili)',
      address: 'Peter Odili Road, Trans Amadi, Port Harcourt',
      locationType: 'supermarket_plaza',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the open customer parking forecourt. Wide open space suitable for vehicle pull-up and bulky item checks.',
      lat: 4.8021,
      lng: 7.0398,
    },
  ],
};

/**
 * Fetch raw nearby places from OpenStreetMap Overpass API
 */
async function fetchOverpassNearbyPlaces(lat, lng, radiusMeters = 3000) {
  try {
    const query = `
      [out:json][timeout:8];
      (
        node["shop"~"supermarket|mall|department_store"](around:${radiusMeters},${lat},${lng});
        node["amenity"~"bank|police|fuel"](around:${radiusMeters},${lat},${lng});
        way["shop"~"supermarket|mall|department_store"](around:${radiusMeters},${lat},${lng});
        way["amenity"~"bank|police|fuel"](around:${radiusMeters},${lat},${lng});
      );
      out center 15;
    `;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.elements) return [];

    return data.elements
      .map((el) => {
        const tags = el.tags || {};
        const name = tags.name || tags['brand:name'] || tags.brand;
        if (!name) return null;

        const pLat = el.lat || el.center?.lat;
        const pLng = el.lon || el.center?.lon;
        const street = tags['addr:street'] || tags['addr:full'] || tags['addr:city'] || '';

        return {
          name,
          address: street ? `${name}, ${street}` : name,
          amenity: tags.amenity || tags.shop,
          lat: pLat,
          lng: pLng,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Calculate distance between two coordinate pairs in km
 */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
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
  return Number((R * c).toFixed(1));
}

/**
 * Smart Geo-AI Safe Meetup Spot Generator
 */
export async function getSmartSafeMeetupSpots({
  lat,
  lng,
  city = 'Lagos',
  neighborhood = '',
  listingId = null,
}) {
  let itemTitle = 'General Marketplace Item';
  let itemCategory = 'Electronics';

  if (listingId) {
    try {
      const listing = await Listing.findById(listingId).select('title category mode price');
      if (listing) {
        itemTitle = listing.title;
        itemCategory = listing.category;
      }
    } catch {
      // Continue with default
    }
  }

  // 1. Collect candidate venues
  let candidatePlaces = [];

  if (lat && lng) {
    candidatePlaces = await fetchOverpassNearbyPlaces(lat, lng, 3500);
  }

  // If Overpass returned few results or lat/lng not provided, blend with curated regional hubs
  const normalizedCity = (city || 'lagos').toLowerCase().trim();
  const regionalHubs =
    NIGERIAN_SAFE_HUBS[normalizedCity] ||
    Object.keys(NIGERIAN_SAFE_HUBS).find((k) => normalizedCity.includes(k))
      ? NIGERIAN_SAFE_HUBS[Object.keys(NIGERIAN_SAFE_HUBS).find((k) => normalizedCity.includes(k))]
      : NIGERIAN_SAFE_HUBS.lagos;

  const combinedCandidates = [...candidatePlaces, ...regionalHubs].slice(0, 10);

  // 2. Use Gemini AI for Spatial & Size-Aware Reasoner
  const ai = getAiClient();
  if (ai) {
    try {
    const prompt = `
You are the LocalMarket Safe Meetup Reasoner.
Item being traded: "${itemTitle}" (Category: "${itemCategory}")
User Location Context: Lat: ${lat || 'unknown'}, Lng: ${lng || 'unknown'}, City: "${city}", Neighborhood: "${neighborhood}".

Raw Venue Candidates:
${JSON.stringify(combinedCandidates, null, 2)}

Instructions:
1. Determine if this item is "bulky" (e.g. TVs, generators, furniture, desktop monitors, bicycles, appliances) or "compact/handheld" (e.g. phones, watches, laptops, small fashion).
2. CRITICAL CONSTRAINT: DO NOT recommend cramped indoor restaurants, food joints, or quiet residential side-streets. We cannot sell televisions or heavy goods inside eateries!
3. For bulky items, prioritize venues with wide open customer car parks, vehicle pull-up clearance, or mall loading concourses.
4. For compact items, prioritize bank ATM galleries with 24/7 security, well-lit supermarket lobbies, or active mall atriums.
5. Select the top 3-4 best venues and provide a helpful, natural-language "plainDescription" explaining exactly where to stand (e.g. "Meet in the open customer parking lot near the security gate. Broad daylight, room for car loading, high visibility.") so users who do not understand map directions can easily recognize where to go.

Output strictly valid JSON with no markdown formatting:
[
  {
    "name": "string",
    "address": "string",
    "locationType": "supermarket_plaza" | "mall_entrance" | "fuel_station_forecourt" | "bank_security_zone" | "commercial_plaza",
    "spaceTag": "Open Space & Vehicle Accessible" | "24/7 Security & CCTV" | "Well-Lit Commercial Hub",
    "plainDescription": "string (clear landmarks, parking info, and safety advice)",
    "lat": number,
    "lng": number
  }
]
`;

    const aiRes = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
    });

    let rawText = aiRes.text.trim();
    // Clean code fences if present
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsedSpots = JSON.parse(rawText);

    if (Array.isArray(parsedSpots) && parsedSpots.length > 0) {
      return parsedSpots.map((spot) => {
        const spotLat = Number(spot.lat) || lat;
        const spotLng = Number(spot.lng) || lng;
        const dist = lat && lng && spotLat && spotLng ? getDistanceKm(lat, lng, spotLat, spotLng) : null;

        const searchQuery = encodeURIComponent(`${spot.name} ${spot.address || city}`);
        return {
          name: spot.name,
          address: spot.address || `${spot.name}, ${city}`,
          locationType: spot.locationType || 'commercial_plaza',
          spaceTag: spot.spaceTag || 'Open Space & Vehicle Accessible',
          plainDescription: spot.plainDescription,
          distance: dist ? `${dist} km away` : 'Nearby in your city',
          distanceKm: dist,
          mapUrl: `https://www.google.com/maps/search/?api=1&query=${searchQuery}`,
          lat: spotLat,
          lng: spotLng,
        };
      });
    }
  } catch (err) {
    console.error('Gemini safe spot recommendation error, using verified fallbacks:', err.message);
  }
}

  // Fallback: format regional hubs with distance and map URLs
  return regionalHubs.map((hub) => {
    const dist = lat && lng && hub.lat && hub.lng ? getDistanceKm(lat, lng, hub.lat, hub.lng) : null;
    const searchQuery = encodeURIComponent(`${hub.name} ${hub.address}`);
    return {
      name: hub.name,
      address: hub.address,
      locationType: hub.locationType,
      spaceTag: hub.spaceTag,
      plainDescription: hub.plainDescription,
      distance: dist ? `${dist} km away` : 'Nearby in your city',
      distanceKm: dist,
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${searchQuery}`,
      lat: hub.lat,
      lng: hub.lng,
    };
  });
}
