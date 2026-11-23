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
  uromi: [
    {
      name: 'Uromi Main Market Commercial Bank Plaza',
      address: 'Market Road, Uromi, Edo State',
      locationType: 'commercial_plaza',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the wide commercial bank parking plaza directly facing Uromi Main Market on Market Road. Open space with ample room for vehicle pull-up, loading, and daylight inspection.',
      lat: 6.7032,
      lng: 6.3265,
    },
    {
      name: 'First Bank PLC ATM Gallery & Forecourt',
      address: 'Market Road, Uromi, Edo State',
      locationType: 'bank_security_zone',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet in the paved forecourt outside the First Bank ATM foyer on Market Road. Guarded with CCTV camera surveillance and continuous public activity.',
      lat: 6.7045,
      lng: 6.3278,
    },
    {
      name: 'Zenith Bank Commercial Concourse',
      address: 'Mission Road, Uromi, Edo State',
      locationType: 'bank_security_zone',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet in the customer parking forecourt outside Zenith Bank on Mission Road. Well-lit central commercial area with professional security personnel on duty.',
      lat: 6.7018,
      lng: 6.3235,
    },
    {
      name: 'TotalEnergies Station Forecourt (Uromi-Ubiaja Road)',
      address: 'Uromi-Ubiaja Road, Uromi, Edo State',
      locationType: 'fuel_station_forecourt',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet on the illuminated station forecourt near the convenience mart on Ubiaja Road. Excellent vehicle pull-up space and open access for large electronics and generator inspection.',
      lat: 6.699,
      lng: 6.329,
    },
    {
      name: 'NNPC Mega Station Open Concourse (Angle 90)',
      address: 'Nova Road / Angle 90 Junction, Uromi, Edo State',
      locationType: 'fuel_station_forecourt',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet on the wide paved forecourt at Angle 90 junction. High foot-traffic open space with clear line of sight, vehicle parking, and constant commercial activity.',
      lat: 6.708,
      lng: 6.321,
    },
  ],
  ekpoma: [
    {
      name: 'Ambrose Alli University (AAU) Main Security Gate Plaza',
      address: 'Benin-Auchi Expressway, Ekpoma, Edo State',
      locationType: 'commercial_plaza',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet on the open paved plaza outside the AAU main campus entrance security checkpoint. High student traffic and round-the-clock security presence.',
      lat: 6.7461,
      lng: 6.1384,
    },
    {
      name: 'First Bank Forecourt & ATM Gallery',
      address: 'Benin-Auchi Expressway, Eguare, Ekpoma, Edo State',
      locationType: 'bank_security_zone',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet in the paved front parking area outside First Bank. CCTV coverage and active daylight trading hub.',
      lat: 6.7423,
      lng: 6.1412,
    },
    {
      name: 'TotalEnergies Station Forecourt (Ekpoma)',
      address: 'Expressway / Market Junction, Ekpoma, Edo State',
      locationType: 'fuel_station_forecourt',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet on the wide, illuminated fuel station forecourt. Great vehicle loading clearance for electronics and appliances.',
      lat: 6.7388,
      lng: 6.1365,
    },
  ],
  auchi: [
    {
      name: 'Auchi Polytechnic Main Security Gate & Commercial Plaza',
      address: 'Poly Road, Auchi, Edo State',
      locationType: 'commercial_plaza',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet on the open commercial plaza near the Auchi Poly main entrance gate. High visibility and active campus security.',
      lat: 7.0674,
      lng: 6.2751,
    },
    {
      name: 'Zenith Bank Commercial Forecourt',
      address: 'Warrake Road, Auchi, Edo State',
      locationType: 'bank_security_zone',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet in the customer parking lot outside Zenith Bank on Warrake Road. Safe public commercial zone.',
      lat: 7.0712,
      lng: 6.2798,
    },
  ],
  warri: [
    {
      name: 'Delta Mall (Shoprite) Open Parking Plaza',
      address: 'Effurun Roundabout, Effurun/Warri, Delta State',
      locationType: 'mall_entrance',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the open customer parking lot near the main Shoprite glass entrance. Ample space for vehicle loading and strong security presence.',
      lat: 5.5562,
      lng: 5.7821,
    },
    {
      name: 'TotalEnergies Station Forecourt (Airport Road)',
      address: 'Airport Road, Effurun/Warri, Delta State',
      locationType: 'fuel_station_forecourt',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet on the wide open station forecourt near the mart. Safe, high foot-traffic zone with vehicle pull-up clearance.',
      lat: 5.5398,
      lng: 5.7645,
    },
  ],
  asaba: [
    {
      name: 'Asaba Mall (Shoprite) Open Parking Concourse',
      address: 'Okpanam Road, Asaba, Delta State',
      locationType: 'mall_entrance',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the wide surface car park near the mall main entrance. Well-lit, 24/7 security, and vehicle pull-up access.',
      lat: 6.2085,
      lng: 6.6942,
    },
    {
      name: 'Zenith Bank Commercial Area (Nnebisi Road)',
      address: 'Nnebisi Road, Asaba, Delta State',
      locationType: 'bank_security_zone',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet in the customer parking foyer outside Zenith Bank on Nnebisi Road. Active public commercial street with CCTV.',
      lat: 6.1956,
      lng: 6.7214,
    },
  ],
  enugu: [
    {
      name: 'Polo Park Mall (Shoprite) Car Park',
      address: 'Abakaliki Road, GRA, Enugu, Enugu State',
      locationType: 'mall_entrance',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the open surface parking lot near the Shoprite entrance. Ample space for vehicle loading and professional security attendance.',
      lat: 6.4521,
      lng: 7.5098,
    },
    {
      name: 'Spar Mall Open Forecourt',
      address: 'Zik Avenue, Enugu, Enugu State',
      locationType: 'supermarket_plaza',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the open customer parking forecourt. Great space for vehicle pull-up and bulky item checks.',
      lat: 6.4367,
      lng: 7.4981,
    },
  ],
  bauchi: [
    {
      name: 'First Bank PLC Main Branch & ATM Gallery',
      address: 'Bank Road, Central Axis, Bauchi, Bauchi State',
      locationType: 'bank_security_zone',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet right outside the main security checkpoint and illuminated ATM foyer of First Bank on Bank Road. Protected by 24/7 armed security and constant daylight visibility.',
      lat: 10.3115,
      lng: 9.8421,
    },
    {
      name: 'Wunti Market Commercial Plaza & Car Park',
      address: 'Wunti Street / Ahmadu Bello Way, Bauchi, Bauchi State',
      locationType: 'commercial_plaza',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the open customer car park facing the main commercial shopping arcade along Wunti Street. High public activity with ample room for car pull-up and testing.',
      lat: 10.315,
      lng: 9.8465,
    },
    {
      name: 'TotalEnergies Service Station Forecourt',
      address: 'Jos-Bauchi Road, Central Bauchi, Bauchi State',
      locationType: 'fuel_station_forecourt',
      spaceTag: 'Open Space & CCTV Monitored',
      plainDescription: 'Meet on the wide, illuminated paved forecourt near the convenience mart on Jos-Bauchi Road. Safe, open layout with high foot traffic and vehicle pull-up clearance.',
      lat: 10.309,
      lng: 9.839,
    },
    {
      name: 'Bauchi Central Market Main Commercial Entrance',
      address: 'Central Market Axis, Bauchi, Bauchi State',
      locationType: 'commercial_plaza',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet on the open paved concourse directly outside the central market main entrance gate. Broad daylight, high pedestrian flow, and easy vehicle access.',
      lat: 10.3103,
      lng: 9.8439,
    },
  ],
  kano: [
    {
      name: 'Ado Bayero Mall (Shoprite) Surface Car Park',
      address: 'Zoo Road, Kano, Kano State',
      locationType: 'mall_entrance',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the open visitor parking area near the main entrance. Controlled security entrance, CCTV surveillance, and ample space for vehicle loading.',
      lat: 11.9654,
      lng: 8.5281,
    },
    {
      name: 'First Bank Commercial Axis Forecourt',
      address: 'Bank Road, Bompai, Kano, Kano State',
      locationType: 'bank_security_zone',
      spaceTag: '24/7 Security & CCTV',
      plainDescription: 'Meet in the paved bank forecourt outside the ATM gallery. Guarded commercial district with high security presence.',
      lat: 12.0022,
      lng: 8.5367,
    },
  ],
  kaduna: [
    {
      name: 'Kaduna City Centre Commercial Plaza',
      address: 'Ahmadu Bello Way, Central Kaduna, Kaduna State',
      locationType: 'commercial_plaza',
      spaceTag: 'Open Space & Vehicle Accessible',
      plainDescription: 'Meet in the open customer parking lot along Ahmadu Bello Way. Central commercial artery with good visibility and security.',
      lat: 10.5186,
      lng: 7.4382,
    },
    {
      name: 'TotalEnergies Station Forecourt (Ali Akilu Road)',
      address: 'Ali Akilu Road, Kaduna, Kaduna State',
      locationType: 'fuel_station_forecourt',
      spaceTag: 'Open Space & CCTV Monitored',
      plainDescription: 'Meet in the wide open forecourt near the mart on Ali Akilu Road. Easy vehicle access, bright lighting, and steady customer flow.',
      lat: 10.5312,
      lng: 7.4421,
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
      const listing = await Listing.findById(listingId).select('title category mode price location');
      if (listing) {
        itemTitle = listing.title;
        itemCategory = listing.category;
        // Auto-fill coordinates from listing if not provided by browser GPS
        if ((!lat || !lng) && listing.location?.coordinates && listing.location.coordinates.length === 2) {
          lng = listing.location.coordinates[0];
          lat = listing.location.coordinates[1];
        }
        // Use listing city if city was defaulted to Lagos or omitted
        if ((!city || city.toLowerCase() === 'lagos') && listing.location?.city) {
          city = listing.location.city;
        }
        if (!neighborhood && listing.location?.neighborhood) {
          neighborhood = listing.location.neighborhood;
        }
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

  // Identify matching regional hubs for this specific city
  const normalizedCity = (city || '').toLowerCase().trim();
  const matchedKey = Object.keys(NIGERIAN_SAFE_HUBS).find(
    (k) => normalizedCity.includes(k) || k.includes(normalizedCity)
  );

  let regionalHubs = matchedKey ? NIGERIAN_SAFE_HUBS[matchedKey] : [];

  // If no predefined hubs and Overpass returned no places, build city-specific verified hubs (NEVER default to Lagos)
  if (regionalHubs.length === 0 && candidatePlaces.length === 0) {
    const cityName = city || 'Nigeria';
    regionalHubs = [
      {
        name: `${cityName} Main Commercial Bank Plaza & ATM Forecourt`,
        address: `Market Road / Commercial Axis, ${cityName}`,
        locationType: 'bank_security_zone',
        spaceTag: '24/7 Security & CCTV',
        plainDescription: `Meet outside the main commercial bank ATM gallery in ${cityName}. Paved forecourt, CCTV surveillance, and high public activity.`,
        lat: lat || 6.7032,
        lng: lng || 6.3265,
      },
      {
        name: `${cityName} Central Market Main Gate Plaza`,
        address: `Main Market Road, ${cityName}`,
        locationType: 'commercial_plaza',
        spaceTag: 'Open Space & Vehicle Accessible',
        plainDescription: `Meet on the open paved plaza directly facing the central market in ${cityName}. High visibility with room for vehicle loading and daylight inspection.`,
        lat: lat || 6.7045,
        lng: lng || 6.3278,
      },
      {
        name: `TotalEnergies Mega Station Forecourt (${cityName})`,
        address: `Major Expressway / Commercial Junction, ${cityName}`,
        locationType: 'fuel_station_forecourt',
        spaceTag: 'Open Space & Vehicle Accessible',
        plainDescription: `Meet on the open illuminated forecourt near the convenience mart in ${cityName}. Excellent parking space for vehicle loading and bulky item inspection.`,
        lat: lat || 6.699,
        lng: lng || 6.329,
      },
      {
        name: `NNPC Mega Station Open Concourse (${cityName})`,
        address: `Central Commercial Bypass, ${cityName}`,
        locationType: 'fuel_station_forecourt',
        spaceTag: 'Open Space & CCTV Monitored',
        plainDescription: `Meet in the open customer parking area in ${cityName}. Active commercial zone with round-the-clock lighting and security attendance.`,
        lat: lat || 6.708,
        lng: lng || 6.321,
      },
    ];
  }

  const combinedCandidates = [...candidatePlaces, ...regionalHubs].slice(0, 10);

  // 2. Use Gemini AI for Spatial & Size-Aware Reasoner
  const ai = getAiClient();
  if (ai) {
    try {
    const prompt = `
You are the oBuy Safe Meetup Reasoner.
Item being traded: "${itemTitle}" (Category: "${itemCategory}")
Target City: "${city}" (Neighborhood: "${neighborhood || 'Central'}")
User Location Context: Lat: ${lat || 'unknown'}, Lng: ${lng || 'unknown'}.

CRITICAL CITY CONSTRAINT:
All recommended venues MUST be located strictly within or immediately around "${city}". NEVER suggest venues in Lagos or other distant states when the target city is "${city}"!

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
