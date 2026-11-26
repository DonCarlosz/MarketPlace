import mongoose from 'mongoose';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { escapeRegex } from '../utils/sanitize.js';
import {
  getAiClient,
  generateWithFallback,
  parseStrictJson,
  sanitizeAiText,
} from './geminiClient.js';

// Exact category taxonomy matching CreateListingPage.jsx (CATEGORIES_BY_MODE)
const CATEGORIES_BY_MODE = {
  'second-hand': [
    'Electronics',
    'Furniture',
    'Vehicles',
    'Clothing & Shoes',
    'Home & Garden',
    'Sports & Outdoors',
    'Collectibles',
    'Tools',
    'Books & Games',
    'Other',
  ],
  new: [
    'Electronics',
    'Fashion & Apparel',
    'Home Decor',
    'Beauty & Personal Care',
    'Fitness & Gear',
    'Gadgets & Tech',
    'Handmade & Crafts',
    'Groceries & Snacks',
    'Other',
  ],
  service: [
    'Barbers & Hair',
    'Nail & Lash Techs',
    'Photography & Video',
    'Home Repair & Handyman',
    'Tutors & Lessons',
    'House Cleaning',
    'Auto Detailing & Mechanics',
    'Events & Catering',
    'Personal Trainers',
    'Other',
  ],
};

// Nigerian marketplace synonym groups to improve recall without hallucinating
const KEYWORD_SYNONYMS = {
  phone: ['phone', 'iphone', 'samsung', 'tecno', 'infinix', 'redmi', 'xiaomi', 'pixel', 'smartphone', 'mobile'],
  smartphone: ['smartphone', 'phone', 'iphone', 'samsung', 'tecno', 'infinix', 'redmi'],
  laptop: ['laptop', 'macbook', 'elitebook', 'thinkpad', 'hp', 'dell', 'lenovo', 'asus', 'acer', 'computer', 'pc'],
  computer: ['computer', 'laptop', 'pc', 'desktop', 'macbook', 'monitor'],
  tv: ['tv', 'television', 'hisense', 'smart tv', '4k', 'led', 'lg'],
  television: ['television', 'tv', 'hisense', 'smart tv', '4k'],
  generator: ['generator', 'gen', 'lutian', 'elepaq', 'sumec', 'firman', 'kva', 'petrol'],
  gen: ['gen', 'generator', 'lutian', 'elepaq', 'sumec', 'firman', 'kva'],
  solar: ['solar', 'inverter', 'battery', 'panel', 'electrical'],
  inverter: ['inverter', 'solar', 'battery', 'electrical'],
  speaker: ['speaker', 'jbl', 'partybox', 'bluetooth', 'audio', 'soundbar'],
  powerbank: ['power bank', 'powerbank', 'anker', 'charger'],
  lamp: ['lamp', 'light', 'rgb', 'floor lamp', 'decor'],
  dumbbell: ['dumbbell', 'dumbbells', 'weights', 'fitness', 'gym'],
  gym: ['gym', 'fitness', 'dumbbell', 'dumbbells', 'weights', 'trainer'],
  repair: ['repair', 'fix', 'screen', 'soldering', 'battery', 'technician', 'handyman', 'mechanic'],
  barber: ['barber', 'hair', 'fade', 'braid', 'salon', 'stylist'],
  tea: ['tea', 'smokers tea', 'herbal', 'drink'],
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'find', 'show', 'give', 'tell', 'list', 'search', 'look', 'looking',
  'for', 'me', 'my', 'your', 'our', 'can', 'you', 'please', 'pls', 'abeg',
  'what', 'which', 'who', 'where', 'when', 'how', 'do', 'does', 'did',
  'have', 'has', 'had', 'any', 'some', 'all', 'available', 'active',
  'currently', 'right', 'now', 'here', 'on', 'in', 'at', 'of', 'to',
  'from', 'by', 'with', 'about', 'near', 'around', 'items', 'item',
  'products', 'product', 'goods', 'listings', 'listing', 'obuy',
  'buy', 'sell', 'selling', 'seller', 'sellers', 'store', 'market',
  'marketplace', 'under', 'below', 'less', 'than', 'above', 'over',
  'between', 'cheaper', 'cheapest', 'expensive', 'best', 'good', 'cheap',
  'price', 'cost', 'naira', 'ngn', 'want', 'need', 'get', 'see',
]);

// Master System Instruction: Strictly Grounded, Honest, Instruction-Following
const ASSISTANT_SYSTEM_INSTRUCTION = `
You are oBuy AI, the official assistant for oBuy (Nigeria's zero-fee peer-to-peer marketplace and local services app).

CRITICAL TRUTH & ANTI-HALLUCINATION RULES (HIGHEST PRIORITY):
1. GROUNDING ONLY: You may ONLY reference listings, prices, titles, sellers, cities, ratings, specs, and counts that explicitly appear inside the VERIFIED_DATABASE_CONTEXT JSON provided in the user's message.
2. NEVER INVENT DATA: NEVER fabricate, guess, or make up any listing, price, seller name, phone number, review score, street address, or product spec. If a listing detail is not in VERIFIED_DATABASE_CONTEXT, say it is not listed and advise asking the seller in chat.
3. HONEST EMPTY STATES:
   - If sellerNotFound is present, explicitly state that no active seller by that name is currently listed on oBuy. Do NOT substitute another seller's items as theirs.
   - If matchedListings is empty, clearly say no active listings match those exact criteria right now. If crossCityAlternatives is present, clearly label them as available in OTHER cities (never pretend they are in the requested city).
   - Never violate user price limits (e.g., if user asked for items under ₦100,000, NEVER recommend a ₦245,000 item as a match).
4. VERIFIED OBUY PLATFORM FACTS (WHAT EXISTS vs WHAT DOES NOT EXIST):
   - WHAT OBUY HAS:
     * Three modes: Second-Hand Goods (pre-loved items with flaw disclosures), Brand-New Items, and Local Services (repairs, solar/electrical, barbers, tutors, handwork).
     * 100% zero listing fees and zero sales commission. Buyers and sellers deal directly in person.
     * In-app real-time chat with text messages, voice notes (playable on Android and iPhone), structured Make Offer / Counter-Offer / Accept / Decline cards, Message Requests inbox (up to 5 messages before acceptance), Block/Report, and WhatsApp-style long-press delete chat.
     * AI Listing Co-Pilot inside Post Listing (auto-drafts title, specs, description, and Nigerian market price band).
     * AI Safe Meetup Spot finder inside chat (suggests open public spots with CCTV/parking: bank ATM forecourts, supermarket/mall car parks, fuel station forecourts). Never recommend cramped indoor eateries for bulky items (TVs, generators, appliances, furniture).
     * Seller 12-Month Reputation Scorecard (Positive/Neutral/Negative counts + Detailed Seller Ratings for Item Accuracy, Communication, and Punctuality out of 5.0 stars) and Email OTP Verification badges.
     * Saved Favorites (Watchlist), App Permissions panel, and installable mobile PWA.
   - WHAT OBUY DOES NOT HAVE (NEVER CLAIM THESE EXIST):
     * NO shopping cart and NO online checkout.
     * NO in-app wallet, NO escrow, and NO card/online payment processing inside oBuy.
     * NO built-in courier delivery service or automated package tracking.
     * NO paid ad boosts or commission charges.
     * ONLY mention these absent features if the user asks about a cart, wallet, escrow, card payment, or order tracking - in that case politely clarify oBuy does not have them and explain in-person inspection + cash/transfer. Do NOT bring up missing features unprompted on normal search results.
5. STRICT INSTRUCTION FOLLOWING:
   - Obey EVERY explicit user constraint (word count, bullet count, table format, language/Pidgin, brevity, yes/no, comparisons, sorting).
   - When the user is viewing a specific listing (ACTIVE_VIEWING_LISTING is provided) and says "this", "it", or "this item", answer specifically about that exact listing.
6. STYLE & FORMATTING:
   - Be clear, sharp, practical, and concise. Avoid robotic filler and never claim to be "omniscient".
   - Format prices with the Naira sign and commas (e.g. ₦45,000).
   - NEVER use em dashes or en dashes. Use standard hyphens (-), colons (:), or bullet points (- ).
   - When matching listings are returned, briefly highlight the exact matching items (title, exact price, city, seller) and let the user know they can tap the cards below to open details or chat.
`.trim();

// Short-lived cached snapshot of live active marketplace inventory (30 seconds)
let snapshotCache = { data: null, expiresAt: 0 };

async function getMarketplaceSnapshot() {
  const now = Date.now();
  if (snapshotCache.data && now < snapshotCache.expiresAt) {
    return snapshotCache.data;
  }

  try {
    const activeListings = await Listing.find({ status: 'active' })
      .populate('seller', 'name isVerified location')
      .select('title price priceType mode category condition location.city seller createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const totalActive = await Listing.countDocuments({ status: 'active' });
    const countsByMode = { 'second-hand': 0, new: 0, service: 0 };
    const citySet = new Set();
    const categorySet = new Set();
    const sellerMap = new Map();

    const catalogIndex = activeListings.map((l) => {
      if (countsByMode[l.mode] !== undefined) countsByMode[l.mode] += 1;
      const city = l.location?.city || 'Nigeria';
      citySet.add(city);
      if (l.category) categorySet.add(l.category);
      const sellerName = l.seller?.name || 'Local Seller';
      if (!sellerMap.has(sellerName)) {
        sellerMap.set(sellerName, {
          name: sellerName,
          verified: Boolean(l.seller?.isVerified),
          city: l.seller?.location?.city || city,
        });
      }
      return {
        id: l._id.toString(),
        title: l.title,
        price: l.price,
        mode: l.mode,
        category: l.category,
        city,
        sellerName,
      };
    });

    const data = {
      totalActive,
      countsByMode,
      activeCities: [...citySet],
      activeCategories: [...categorySet],
      activeSellers: [...sellerMap.values()],
      catalogIndex: catalogIndex.slice(0, 35),
    };

    snapshotCache = { data, expiresAt: now + 30 * 1000 };
    return data;
  } catch (err) {
    console.warn('Marketplace snapshot error:', err.message);
    return {
      totalActive: 0,
      countsByMode: { 'second-hand': 0, new: 0, service: 0 },
      activeCities: [],
      activeCategories: [],
      activeSellers: [],
      catalogIndex: [],
    };
  }
}

function serializeListingForAi(l, includeDetails = false) {
  const totalRevs = l.seller?.feedbackScore?.totalReviews || 0;
  const sellerPositive =
    totalRevs > 0 ? l.seller?.feedbackScore?.positivePercentage ?? null : null;

  const base = {
    _id: l._id.toString(),
    title: l.title,
    price: l.price,
    priceType: l.priceType,
    mode: l.mode,
    category: l.category,
    condition: l.condition,
    city: l.location?.city || 'Nigeria',
    neighborhood: l.location?.neighborhood || '',
    image: l.images?.[0]?.url || '',
    sellerName: l.seller?.name || 'Local Seller',
    sellerPositive,
    sellerTotalReviews: totalRevs,
    sellerVerified: Boolean(l.seller?.isVerified),
    preferredMeetup: l.preferredMeetup || '',
  };

  if (includeDetails) {
    base.description = (l.description || '').slice(0, 360);
    base.hasFlaws = Boolean(l.hasFlaws);
    base.flawDescription = l.flawDescription || '';
    base.allowsDelivery = Boolean(l.allowsDelivery);
    base.serviceType = l.serviceType || '';
    base.views = l.views || 0;
    if (l.itemSpecifics && typeof l.itemSpecifics === 'object') {
      base.itemSpecifics =
        l.itemSpecifics instanceof Map
          ? Object.fromEntries(l.itemSpecifics)
          : l.itemSpecifics;
    }
  }

  return base;
}

/**
 * Extract structured search intent using recent multi-turn conversation history and live catalog metadata.
 */
async function extractSearchIntent(messages, snapshot, currentListing) {
  const recentHistory = messages
    .slice(-5)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const lastMessage = messages[messages.length - 1]?.content || '';

  const intentPrompt = `
Analyze the latest user message in context of this oBuy marketplace conversation.

KNOWN ACTIVE CITIES: ${JSON.stringify(snapshot.activeCities)}
KNOWN ACTIVE CATEGORIES: ${JSON.stringify(snapshot.activeCategories)}
KNOWN ACTIVE SELLERS: ${JSON.stringify(snapshot.activeSellers.map((s) => s.name))}
USER CURRENTLY VIEWING LISTING: ${currentListing ? JSON.stringify({ title: currentListing.title, price: currentListing.price, city: currentListing.city, sellerName: currentListing.sellerName }) : 'null'}

CONVERSATION (most recent last):
${recentHistory}

Classify intent into strict JSON:
{
  "intentType": "search" | "browse_all" | "current_listing_qa" | "platform_qa" | "general_chat",
  "query": "string (ONLY concise product/service/brand nouns like 'laptop', 'speaker', 'solar', 'tea'; empty string if browsing all or filtering only by seller/city/price)",
  "category": "string or null",
  "mode": "second-hand" | "new" | "service" | null,
  "city": "string or null (extract requested city even if not in KNOWN ACTIVE CITIES)",
  "maxPrice": number or null (convert shorthand: '50k' -> 50000, '1.5m' -> 1500000),
  "minPrice": number or null,
  "sellerName": "string or null (extract requested seller name even if NOT in KNOWN ACTIVE SELLERS!)",
  "sortBy": "newest" | "price_asc" | "price_desc"
}

RULES:
- Use "browse_all" when user asks broadly what is available, what is for sale, cheapest items overall, or everything in a city/mode.
- Use "search" when user asks for specific items, categories, sellers, prices, or follow-ups like "cheaper ones?", "which one is cheapest?", "what else does he sell?" (carry forward seller/item/city from earlier turns!).
- Use "current_listing_qa" when USER CURRENTLY VIEWING LISTING is non-null and the user asks about "this item", "this listing", "is this a fair price", or "what to inspect on this".
- Use "platform_qa" when asking about oBuy rules, fees, safety, wallet, cart, verification, meetups, or how the app works.
- Use "general_chat" for greetings or general non-search instructions.
- NEVER invent a sellerName or city that wasn't mentioned in the conversation.
`.trim();

  try {
    const { text } = await generateWithFallback({
      contents: intentPrompt,
      systemInstruction:
        'You are a strict JSON query parser for a Nigerian marketplace. Output ONLY valid JSON matching the requested schema.',
      temperature: 0.0,
      responseMimeType: 'application/json',
      maxOutputTokens: 320,
      preferFast: true,
    });

    const parsed = parseStrictJson(text);
    return {
      intentType: ['search', 'browse_all', 'current_listing_qa', 'platform_qa', 'general_chat'].includes(
        parsed?.intentType
      )
        ? parsed.intentType
        : 'platform_qa',
      query: typeof parsed?.query === 'string' ? parsed.query.trim().slice(0, 120) : '',
      category: typeof parsed?.category === 'string' && parsed.category.trim() ? parsed.category.trim() : null,
      mode: ['second-hand', 'new', 'service'].includes(parsed?.mode) ? parsed.mode : null,
      city: typeof parsed?.city === 'string' && parsed.city.trim() ? parsed.city.trim() : null,
      maxPrice:
        parsed?.maxPrice !== null && parsed?.maxPrice !== undefined && Number.isFinite(Number(parsed.maxPrice))
          ? Number(parsed.maxPrice)
          : null,
      minPrice:
        parsed?.minPrice !== null && parsed?.minPrice !== undefined && Number.isFinite(Number(parsed.minPrice))
          ? Number(parsed.minPrice)
          : null,
      sellerName:
        typeof parsed?.sellerName === 'string' && parsed.sellerName.trim()
          ? parsed.sellerName.trim().slice(0, 60)
          : null,
      sortBy: ['newest', 'price_asc', 'price_desc'].includes(parsed?.sortBy)
        ? parsed.sortBy
        : 'newest',
    };
  } catch (err) {
    console.warn('AI search intent fallback:', err.message);
    return heuristicIntentFallback(lastMessage, snapshot);
  }
}

function heuristicIntentFallback(userQuery, snapshot) {
  const lower = (userQuery || '').toLowerCase();
  const isBrowse = /\b(what.*available|what.*for sale|everything|all listings|all items|what.*on obuy|cheapest)\b/i.test(lower);
  const isPlatform = /\b(wallet|cart|escrow|fee|commission|shipping|delivery|safe|meetup|verify|policy|how does obuy)\b/i.test(lower);

  let maxPrice = null;
  const underMatch = lower.match(/(?:under|below|less than|max|<=)\s*₦?\s*([\d,.]+)\s*(k|m)?/i);
  if (underMatch) {
    const base = Number(underMatch[1].replace(/,/g, ''));
    const mult = underMatch[2]?.toLowerCase() === 'm' ? 1_000_000 : underMatch[2]?.toLowerCase() === 'k' ? 1_000 : 1;
    if (Number.isFinite(base)) maxPrice = base * mult;
  }

  let matchedCity = null;
  for (const c of snapshot.activeCities || []) {
    if (lower.includes(c.toLowerCase())) {
      matchedCity = c;
      break;
    }
  }

  let matchedSeller = null;
  for (const s of snapshot.activeSellers || []) {
    const firstWord = s.name.split(/\s+/)[0];
    if (firstWord && firstWord.length >= 3 && lower.includes(firstWord.toLowerCase())) {
      matchedSeller = s.name;
      break;
    }
  }

  if (isPlatform && !matchedSeller && !maxPrice && !isBrowse) {
    return {
      intentType: 'platform_qa',
      query: '',
      category: null,
      mode: null,
      city: null,
      maxPrice: null,
      minPrice: null,
      sellerName: null,
      sortBy: 'newest',
    };
  }

  const isSearch =
    isBrowse ||
    Boolean(matchedSeller || matchedCity || maxPrice) ||
    /\b(buy|find|search|show|selling|looking for|laptop|phone|tv|generator|speaker|lamp|tea|solar|repair|barber|dumbbell|service)\b/i.test(
      lower
    );

  return {
    intentType: isBrowse ? 'browse_all' : isSearch ? 'search' : 'platform_qa',
    query: isBrowse ? '' : userQuery,
    category: null,
    mode: /service|repair|plumber|barber|electrician|solar/i.test(lower)
      ? 'service'
      : /brand[- ]?new/i.test(lower)
      ? 'new'
      : /second[- ]?hand|used|pre-owned/i.test(lower)
      ? 'second-hand'
      : null,
    city: matchedCity,
    maxPrice,
    minPrice: null,
    sellerName: matchedSeller,
    sortBy: /cheapest|lowest/i.test(lower)
      ? 'price_asc'
      : /most expensive|highest/i.test(lower)
      ? 'price_desc'
      : 'newest',
  };
}

/**
 * Expand cleaned keywords with Nigerian marketplace synonyms (ReDoS-hardened).
 */
function buildKeywordPatterns(queryText) {
  if (typeof queryText !== 'string' || !queryText.trim()) return [];
  const rawWords = queryText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
    .slice(0, 6);

  const expanded = new Set();
  for (const w of rawWords) {
    expanded.add(w);
    if (w.endsWith('s') && w.length > 3) expanded.add(w.slice(0, -1));
    const synList = KEYWORD_SYNONYMS[w] || KEYWORD_SYNONYMS[w.replace(/s$/, '')];
    if (synList) {
      for (const s of synList) expanded.add(s);
    }
  }

  return [...expanded].slice(0, 14).map((term) => new RegExp(escapeRegex(term), 'i'));
}

/**
 * Execute strictly enforced MongoDB listing query with honest sellerNotFound & cross-city handling.
 */
async function queryDatabaseListings(intent) {
  try {
    const buildFilter = ({ includeCity = true } = {}) => {
      const filter = { status: 'active' };

      if (includeCity && typeof intent.city === 'string' && intent.city.trim()) {
        const safeCity = escapeRegex(intent.city.trim().slice(0, 60));
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { 'location.city': { $regex: new RegExp(safeCity, 'i') } },
            { 'location.neighborhood': { $regex: new RegExp(safeCity, 'i') } },
          ],
        });
      }

      if (intent.mode && ['second-hand', 'new', 'service'].includes(intent.mode)) {
        filter.mode = intent.mode;
      }

      if (typeof intent.category === 'string' && intent.category.trim()) {
        const safeCat = escapeRegex(intent.category.trim().slice(0, 60));
        filter.category = { $regex: new RegExp(safeCat, 'i') };
      }

      if (intent.minPrice != null || intent.maxPrice != null) {
        filter.price = {};
        if (intent.minPrice != null && Number.isFinite(Number(intent.minPrice))) {
          filter.price.$gte = Number(intent.minPrice);
        }
        if (intent.maxPrice != null && Number.isFinite(Number(intent.maxPrice))) {
          filter.price.$lte = Number(intent.maxPrice);
        }
      }

      const patterns = buildKeywordPatterns(intent.query);
      if (patterns.length > 0) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { title: { $in: patterns } },
            { description: { $in: patterns } },
            { category: { $in: patterns } },
            { serviceType: { $in: patterns } },
          ],
        });
      }

      return filter;
    };

    const sortSpec =
      intent.sortBy === 'price_asc'
        ? { price: 1, createdAt: -1 }
        : intent.sortBy === 'price_desc'
        ? { price: -1, createdAt: -1 }
        : { createdAt: -1 };

    // Strict seller lookup: if user explicitly asked for a seller who doesn't exist, NEVER dump random listings!
    let sellerIds = null;
    if (typeof intent.sellerName === 'string' && intent.sellerName.trim()) {
      const safeSeller = escapeRegex(intent.sellerName.trim().slice(0, 60));
      const sellerUsers = await User.find({
        name: { $regex: new RegExp(safeSeller, 'i') },
      })
        .select('_id')
        .lean();

      if (sellerUsers.length === 0) {
        return {
          listings: [],
          sellerNotFound: intent.sellerName.trim(),
          crossCityAlternatives: [],
        };
      }
      sellerIds = sellerUsers.map((u) => u._id);
    }

    const primaryFilter = buildFilter({ includeCity: true });
    if (sellerIds) primaryFilter.seller = { $in: sellerIds };

    let rawListings = await Listing.find(primaryFilter)
      .populate('seller', 'name location isVerified feedbackScore avatar')
      .sort(sortSpec)
      .limit(8)
      .lean();

    // If category filter was overly narrow (e.g. AI guessed 'Phones & Tablets' when DB uses 'Electronics') and keywords were present, retry without category
    if (rawListings.length === 0 && intent.category && intent.query) {
      const relaxed = { ...primaryFilter };
      delete relaxed.category;
      rawListings = await Listing.find(relaxed)
        .populate('seller', 'name location isVerified feedbackScore avatar')
        .sort(sortSpec)
        .limit(8)
        .lean();
    }

    // Strict price verification safety net
    rawListings = rawListings.filter((l) => {
      if (intent.maxPrice != null && Number(l.price) > Number(intent.maxPrice)) return false;
      if (intent.minPrice != null && Number(l.price) < Number(intent.minPrice)) return false;
      return true;
    });

    // If 0 exact matches in the requested city, check other cities honestly so AI never lies about city
    let crossCityAlternatives = [];
    if (rawListings.length === 0 && intent.city) {
      const crossFilter = buildFilter({ includeCity: false });
      if (sellerIds) crossFilter.seller = { $in: sellerIds };
      delete crossFilter.category;
      const altDocs = await Listing.find(crossFilter)
        .populate('seller', 'name location isVerified feedbackScore avatar')
        .sort(sortSpec)
        .limit(4)
        .lean();

      crossCityAlternatives = altDocs
        .filter((l) => {
          if (intent.maxPrice != null && Number(l.price) > Number(intent.maxPrice)) return false;
          if (intent.minPrice != null && Number(l.price) < Number(intent.minPrice)) return false;
          return true;
        })
        .map((l) => serializeListingForAi(l, true));
    }

    return {
      listings: rawListings.slice(0, 6).map((l) => serializeListingForAi(l, true)),
      sellerNotFound: null,
      crossCityAlternatives,
    };
  } catch (err) {
    console.error('Error querying listings for AI assistant:', err);
    return { listings: [], sellerNotFound: null, crossCityAlternatives: [] };
  }
}

/**
 * Fetch exact listing if the user is currently viewing /listing/:id
 */
async function loadCurrentViewingListing(listingId) {
  if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) return null;
  try {
    const doc = await Listing.findById(listingId)
      .populate('seller', 'name location isVerified feedbackScore avatar')
      .lean();
    if (!doc) return null;
    return serializeListingForAi(doc, true);
  } catch {
    return null;
  }
}

/**
 * Handle AI Assistant Conversation (Multi-Turn, Grounded, Strict Instruction Following)
 */
export async function chatWithAssistant({ messages, userContext = {} }) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const ai = getAiClient();

  const [snapshot, currentListing] = await Promise.all([
    getMarketplaceSnapshot(),
    loadCurrentViewingListing(userContext.currentListingId),
  ]);

  let matchedListings = [];
  let sellerNotFound = null;
  let crossCityAlternatives = [];
  let intent = null;

  if (ai) {
    try {
      intent = await extractSearchIntent(messages, snapshot, currentListing);

      if (intent.intentType === 'search' || intent.intentType === 'browse_all') {
        const dbResult = await queryDatabaseListings(intent);
        matchedListings = dbResult.listings;
        sellerNotFound = dbResult.sellerNotFound;
        crossCityAlternatives = dbResult.crossCityAlternatives;
      }

      // Build compact, strictly factual database payload for this turn
      const verifiedContext = {
        userSession: {
          name: userContext.name || 'Guest User',
          city: userContext.city || 'Nigeria',
          currentRoute: userContext.currentRoute || '/',
        },
        marketplaceOverview: {
          totalActiveListings: snapshot.totalActive,
          countsByMode: snapshot.countsByMode,
          activeCities: snapshot.activeCities,
          activeCategories: snapshot.activeCategories,
          activeSellers: snapshot.activeSellers.map((s) => s.name),
        },
        detectedIntent: intent,
        sellerNotFound,
        activeViewingListing: currentListing || null,
        matchedListings,
        crossCityAlternatives,
        // Include compact live catalog index so general/comparison/follow-up questions never hallucinate
        liveCatalogIndex: snapshot.catalogIndex,
      };

      // Convert prior conversation history into true multi-turn Gemini contents
      const priorTurns = messages.slice(-8, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      // Ensure conversation starts with a user turn (Gemini requires first turn = user)
      while (priorTurns.length > 0 && priorTurns[0].role !== 'user') {
        priorTurns.shift();
      }

      const finalUserTurn = {
        role: 'user',
        parts: [
          {
            text: `USER MESSAGE:\n${lastMessage}\n\nVERIFIED_DATABASE_CONTEXT (ONLY factual source of live oBuy listings & sellers):\n${JSON.stringify(
              verifiedContext
            )}\n\nRespond directly to USER MESSAGE following all truthfulness and user formatting instructions strictly.`,
          },
        ],
      };

      const { text } = await generateWithFallback({
        contents: [...priorTurns, finalUserTurn],
        systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
        temperature: 0.2,
        maxOutputTokens: 700,
        preferFast: false,
      });

      // Strip internal detail-only fields before sending listing cards to frontend
      const cardListings = matchedListings.map(
        ({ description, flawDescription, hasFlaws, itemSpecifics, allowsDelivery, serviceType, views, ...card }) =>
          card
      );

      return {
        reply: sanitizeAiText(text),
        listings: cardListings,
      };
    } catch (err) {
      console.error('AI chat error, using verified database fallback:', err.message);
    }
  }

  // Honest fallback if Gemini API is completely unreachable
  const fallbackIntent = heuristicIntentFallback(lastMessage, snapshot);
  if (fallbackIntent.intentType === 'search' || fallbackIntent.intentType === 'browse_all') {
    const dbRes = await queryDatabaseListings(fallbackIntent);
    matchedListings = dbRes.listings;
    sellerNotFound = dbRes.sellerNotFound;
  }

  const cardListings = matchedListings.map(
    ({ description, flawDescription, hasFlaws, itemSpecifics, allowsDelivery, serviceType, views, ...card }) =>
      card
  );

  let fallbackReply;
  if (sellerNotFound) {
    fallbackReply = `I could not find any active seller named "${sellerNotFound}" on oBuy right now. You can browse all active listings on the Market tab.`;
  } else if (cardListings.length > 0) {
    fallbackReply = `I found ${cardListings.length} active listing${cardListings.length > 1 ? 's' : ''} matching your request on oBuy. Tap any card below to view full details, chat with the seller, or make an offer.`;
  } else {
    fallbackReply = `Our AI engine is momentarily busy, so I could not generate a full custom answer right now. You can browse active items directly on the Market tab, or try asking again in a few seconds.`;
  }

  return {
    reply: fallbackReply,
    listings: cardListings,
  };
}

/**
 * Seller Listing Wizard Co-Pilot (Grounded Auto-Drafting & Nigerian Market Valuation)
 */
export async function draftListingCoPilot({ prompt: userPrompt, category, mode, imageBase64, mimeType }) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('Gemini AI service is currently unavailable. Please verify API key.');
  }

  const resolvedMode = ['second-hand', 'new', 'service'].includes(mode) ? mode : 'second-hand';
  const allowedCategories = CATEGORIES_BY_MODE[resolvedMode];
  const allowedConditions =
    resolvedMode === 'new'
      ? ['brand-new']
      : resolvedMode === 'service'
      ? ['not-applicable']
      : ['like-new', 'good', 'fair', 'for-parts'];

  const coPilotSystemInstruction = `
You are the oBuy Listing Wizard Co-Pilot for Nigeria's peer-to-peer marketplace.
Generate an honest, accurate, high-converting listing draft in strict JSON.

STRICT ANTI-HALLUCINATION RULES:
1. NEVER invent defects or flaws the seller did not mention (and that are not clearly visible in an uploaded photo). If none are stated, set "flawDescription" to "".
2. NEVER invent fake receipts, warranties, battery health percentages, or extra accessories not mentioned by the seller.
3. If the seller explicitly states a target price (e.g. "240k", "₦45,000", "1.2m"), anchor "suggestedPrice" and "priceCorridor.recommended" closely to that exact number and build realistic "low" (~88-92%) and "high" (~108-115%) bounds around it.
4. Select "category" STRICTLY from the Allowed Categories list provided.
5. Select "condition" STRICTLY from the Allowed Conditions list provided.
6. NEVER use em dashes or en dashes anywhere in the output. Use standard hyphens (-) or bullets.
7. Output ONLY valid JSON matching the exact schema requested.
`.trim();

  const promptText = `
Draft an oBuy listing from this seller input:
- Seller Mode: "${resolvedMode}"
- Seller Category Hint: "${category || 'None'}"
- Allowed Categories (pick EXACTLY one): ${JSON.stringify(allowedCategories)}
- Allowed Conditions (pick EXACTLY one): ${JSON.stringify(allowedConditions)}
- Seller Raw Notes: "${userPrompt || 'Item shown in attached image'}"

Return strict JSON:
{
  "title": "clear accurate title under 75 chars, no spam",
  "description": "2 concise paragraphs + short bullet list of confirmed specs and safe in-person inspection advice",
  "category": "exact match from Allowed Categories",
  "condition": "exact match from Allowed Conditions",
  "suggestedPrice": number (realistic NGN integer),
  "priceCorridor": {
    "low": number (NGN integer, <= recommended),
    "recommended": number (NGN integer),
    "high": number (NGN integer, >= recommended)
  },
  "itemSpecifics": {
    "Brand": "string or empty if unknown",
    "Model": "string or empty if unknown",
    "Storage": "string or empty if not applicable",
    "Color": "string or empty if unknown"
  },
  "flawDescription": "only flaws explicitly stated by seller or visible in photo; otherwise empty string",
  "preferredMeetupAdvice": "safe open public meetup advice suited to item size (open car park/plaza for bulky items; bank ATM gallery or mall for compact items)"
}
`.trim();

  const parts = [];
  if (imageBase64 && mimeType) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    });
  }
  parts.push({ text: promptText });

  const { text } = await generateWithFallback({
    contents: [{ role: 'user', parts }],
    systemInstruction: coPilotSystemInstruction,
    temperature: 0.2,
    responseMimeType: 'application/json',
    maxOutputTokens: 900,
    preferFast: false,
  });

  const parsed = parseStrictJson(text);

  // Server-side validation & clamping so bad/corrupted values can never break the UI
  const safeCategory = allowedCategories.includes(parsed?.category)
    ? parsed.category
    : allowedCategories.includes(category)
    ? category
    : allowedCategories[0];

  const safeCondition = allowedConditions.includes(parsed?.condition)
    ? parsed.condition
    : allowedConditions[0];

  const rawRec = Math.max(500, Math.round(Number(parsed?.priceCorridor?.recommended || parsed?.suggestedPrice || 15000)));
  const rawLow = Math.max(500, Math.round(Number(parsed?.priceCorridor?.low || rawRec * 0.88)));
  const rawHigh = Math.max(rawRec, Math.round(Number(parsed?.priceCorridor?.high || rawRec * 1.12)));

  const sortedPrices = [rawLow, rawRec, rawHigh].sort((a, b) => a - b);
  const low = sortedPrices[0];
  const recommended = sortedPrices[1];
  const high = sortedPrices[2];

  const cleanSpecifics = {};
  if (parsed?.itemSpecifics && typeof parsed.itemSpecifics === 'object') {
    for (const [k, v] of Object.entries(parsed.itemSpecifics)) {
      if (typeof v === 'string' && v.trim() && !/^(unknown|n\/a|none|unspecified)$/i.test(v.trim())) {
        cleanSpecifics[k] = sanitizeAiText(v.trim().slice(0, 80));
      }
    }
  }

  return {
    title: sanitizeAiText(String(parsed?.title || '').slice(0, 80)),
    description: sanitizeAiText(String(parsed?.description || '')),
    category: safeCategory,
    condition: safeCondition,
    suggestedPrice: recommended,
    priceCorridor: { low, recommended, high },
    itemSpecifics: cleanSpecifics,
    flawDescription:
      resolvedMode === 'new' || resolvedMode === 'service'
        ? ''
        : sanitizeAiText(String(parsed?.flawDescription || '')),
    preferredMeetupAdvice: sanitizeAiText(
      String(
        parsed?.preferredMeetupAdvice ||
          'Meet in daylight at a busy bank ATM forecourt, supermarket car park, or shopping mall concourse.'
      )
    ),
  };
}
