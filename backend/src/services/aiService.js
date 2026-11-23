import { GoogleGenAI } from '@google/genai';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { escapeRegex } from '../utils/sanitize.js';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// Master Platform System Prompt
const PLATFORM_SYSTEM_PROMPT = `
You are oBuy AI, the omniscient and friendly platform assistant for oBuy (Nigeria's leading peer-to-peer marketplace and local services platform).

ABOUT OBUY:
1. Core Operating Modes:
   - Second-Hand Goods: Pre-loved electronics, vehicles, fashion, furniture. Transparent flaw disclosures, physical inspection before payment, in-chat price offers.
   - Brand-New Items: Factory-sealed products, retail items, verified stock with distributor warranties.
   - Local Handwork & Services: Electricians, plumbers, generator mechanics, solar installers, tailors, tech specialists. Direct job quotes and transparent availability notes.

2. Zero-Fee Trading Policy:
   - 100% free for buyers and sellers. Zero listing fees, zero sales commissions.
   - Deals happen off-platform in person. Buyers inspect the item physically, confirm functionality, and pay the seller directly (via cash or instant bank transfer).
   - oBuy NEVER asks for commission or escrow processing charges.

3. Trust, Safety & Safe Meetups:
   - Never wire money, advance deposit, or transport fare to anyone before seeing the item.
   - Always meet in daylight in public commercial places: bank ATM galleries with CCTV, supermarket car parks (Shoprite, Market Square), shopping mall concourses, or fuel station forecourts.
   - CRITICAL VENUE RULE: Bulky items (TVs, generators, refrigerators, furniture) require vehicle loading space and parking lot access; NEVER transact bulky items inside cramped indoor restaurants or food joints!

4. Seller Reputation & Scorecard:
   - Transparent 12-month feedback matrix (positive, neutral, negative reviews).
   - Detailed Seller Ratings (DSR) tracking Item Accuracy, Communication, and Punctuality out of 5.0 stars.
   - Account verification badges: Email OTP verified, Phone verified, and Verified Local Member.

5. Currency & Locale:
   - All monetary figures are in Nigerian Naira (₦).
   - You understand Nigerian cities and neighborhoods (Lagos: Ikeja, Yaba, Lekki; Abuja: Wuse 2, Jabi, Garki; Edo: Benin City, Uromi, Ekpoma; Port Harcourt; Ibadan; Bauchi; Kano; Kaduna; etc.).

TONE AND STYLE GUIDELINES:
- Helpful, professional, and warmly Nigerian.
- Format prices strictly with the Naira sign (₦) and commas (e.g. ₦360,000).
- Do NOT use em dashes. Use hyphens, colons, or bullet points instead.
- When listings are provided in context, highlight their key specifications, seller names, condition, and location clearly.
`;

/**
 * Extract search intent and filters from user query
 */
async function extractSearchIntent(ai, userQuery) {
  try {
    const prompt = `
Analyze this user query for oBuy, a peer-to-peer marketplace in Nigeria:
"${userQuery}"

Determine if the user is looking to find, browse, or inquire about items, services, products, or specific sellers.

If YES, output valid JSON:
{
  "hasSearchIntent": true,
  "query": "string (main keywords for item/service, or empty if general)",
  "category": "string or null (e.g. 'Phones & Tablets', 'Electronics', 'Computers & Tech', 'Home Appliances', 'Repairs & Tech', 'Home Services & Trades')",
  "mode": "string or null ('second-hand' | 'new' | 'service')",
  "city": "string or null (e.g. 'Uromi', 'Lagos', 'Abuja', 'Benin City', 'Bauchi')",
  "maxPrice": number or null,
  "minPrice": number or null,
  "sellerName": "string or null (e.g. 'Timothy', 'Martins', 'Isaiah')"
}

If NO (the user is asking general platform questions, policies, help, safety, greetings), output:
{
  "hasSearchIntent": false
}

Output strictly valid JSON with no markdown fences:
`;

    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
    });

    let raw = res.text.trim();
    if (raw.startsWith('```json')) raw = raw.slice(7);
    if (raw.startsWith('```')) raw = raw.slice(3);
    if (raw.endsWith('```')) raw = raw.slice(0, -3);

    return JSON.parse(raw.trim());
  } catch (err) {
    console.warn('AI search intent extraction fallback:', err.message);
    const isSearch = /buy|find|search|sell|looking for|laptop|phone|tv|generator|price|cost|uromi|lagos|timothy|bauchi/i.test(userQuery);
    return {
      hasSearchIntent: isSearch,
      query: userQuery,
      sellerName: /timothy/i.test(userQuery) ? 'Timothy' : null,
      city: /uromi/i.test(userQuery) ? 'Uromi' : /bauchi/i.test(userQuery) ? 'Bauchi' : null,
    };
  }
}

/**
 * Execute MongoDB search based on structured intent (ReDoS-hardened)
 */
async function queryDatabaseListings(intent) {
  try {
    const filter = { status: 'active' };

    if (typeof intent.sellerName === 'string' && intent.sellerName.trim()) {
      const safeSeller = escapeRegex(intent.sellerName.trim().slice(0, 60));
      const sellerUsers = await User.find({
        name: { $regex: new RegExp(safeSeller, 'i') },
      })
        .select('_id')
        .lean();
      if (sellerUsers.length > 0) {
        filter.seller = { $in: sellerUsers.map((u) => u._id) };
      }
    }

    if (typeof intent.city === 'string' && intent.city.trim()) {
      const safeCity = escapeRegex(intent.city.trim().slice(0, 60));
      filter['location.city'] = { $regex: new RegExp(safeCity, 'i') };
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

    if (typeof intent.query === 'string' && intent.query.trim().length > 1) {
      const cleanedWords = intent.query
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(
          (w) =>
            w.length > 2 &&
            !['find', 'show', 'selling', 'what', 'have', 'need', 'with', 'under', 'near'].includes(
              w.toLowerCase()
            )
        )
        .slice(0, 6);

      if (cleanedWords.length > 0) {
        const regexPatterns = cleanedWords.map((w) => new RegExp(escapeRegex(w), 'i'));
        filter.$or = [
          { title: { $in: regexPatterns } },
          { description: { $in: regexPatterns } },
          { category: { $in: regexPatterns } },
        ];
      }
    }

    const listings = await Listing.find(filter)
      .populate('seller', 'name location isVerified feedbackScore avatar')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    return listings.map((l) => {
      const totalRevs = l.seller?.feedbackScore?.totalReviews || 0;
      const sellerPositive = totalRevs > 0 ? l.seller?.feedbackScore?.positivePercentage ?? null : null;
      return {
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
    });
  } catch (err) {
    console.error('Error querying listings for AI assistant:', err);
    return [];
  }
}

/**
 * Handle AI Assistant Conversation
 */
export async function chatWithAssistant({ messages, userContext = {} }) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const ai = getAiClient();

  let matchedListings = [];

  if (ai) {
    try {
      const intent = await extractSearchIntent(ai, lastMessage);
      if (intent.hasSearchIntent) {
        matchedListings = await queryDatabaseListings(intent);
      }

      let contextualAddendum = '';
      if (matchedListings.length > 0) {
        contextualAddendum = `
LIVE MATCHING LISTINGS IN OBUY DATABASE:
${JSON.stringify(matchedListings, null, 2)}

Provide a natural, helpful summary presenting these findings to the user. Mention the seller names, verified status, key features, prices formatted in Nigerian Naira (₦), and where they are located. Let the user know they can click the cards below to see full details, start a chat, or submit an offer.
`;
      } else if (intent.hasSearchIntent) {
        contextualAddendum = `
The user searched for items/sellers matching "${lastMessage}", but no active listings currently matched those exact criteria in the database. Politely inform them, suggest trying broader search terms or alternative categories, and invite them to check back regularly.
`;
      }

      const prompt = `
${PLATFORM_SYSTEM_PROMPT}

USER SESSION CONTEXT:
- Authenticated User: ${userContext.name || 'Guest User'}
- User City: ${userContext.city || 'Nigeria'}

CONVERSATION HISTORY:
${messages
  .slice(-6)
  .map((m) => `${m.role === 'user' ? 'User' : 'oBuy AI'}: ${m.content}`)
  .join('\n')}

${contextualAddendum}

Write your response as oBuy AI directly to the user:
`;

      const aiRes = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
      });

      return {
        reply: aiRes.text.trim(),
        listings: matchedListings,
      };
    } catch (err) {
      console.error('AI chat error, using verified platform fallback:', err.message);
    }
  }

  matchedListings = await queryDatabaseListings({ query: lastMessage });
  return {
    reply:
      matchedListings.length > 0
        ? `Here are the active listings matching your search on oBuy. Click any card below to inspect full specifications, chat with the seller, or propose an offer.`
        : `oBuy is Nigeria's zero-fee peer-to-peer marketplace. You can buy and sell second-hand goods, brand-new items, or hire local artisans with zero commission. Always meet in open public spots such as bank ATM galleries or supermarket plazas to inspect items and pay safely in person.`,
    listings: matchedListings,
  };
}

/**
 * Seller Listing Wizard Co-Pilot (Auto-Drafting & Valuation)
 */
export async function draftListingCoPilot({ prompt: userPrompt, category, mode, imageBase64, mimeType }) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('Gemini AI service is currently unavailable. Please verify API key.');
  }

  const promptText = `
You are the oBuy Listing Wizard Co-Pilot for Nigerian peer-to-peer commerce.
Your mission is to generate a high-converting, honest, and complete listing draft based on the seller's input.

Seller Mode: "${mode || 'second-hand'}" (options: 'second-hand', 'new', 'service')
Seller Category Hint: "${category || ''}"
Seller Raw Notes: "${userPrompt || 'Standard item for sale'}"

Instructions:
1. Generate an accurate, descriptive "title" (under 80 characters, no keyword stuffing).
2. Generate a compelling "description" (2-3 paragraphs with clean bullet points covering specifications, condition, accessories included, and inspection guidance).
3. Select the best matching "category" from: ['Electronics', 'Phones & Tablets', 'Computers & Tech', 'Home Appliances', 'Furniture', 'Fashion & Beauty', 'Sports & Outdoors', 'Vehicles & Autocare', 'Home Services & Trades', 'Repairs & Tech', 'Other'].
4. Determine realistic "condition": ('brand-new' if mode is new, or 'like-new' | 'good' | 'fair' for second-hand, or 'not-applicable' for service).
5. Suggest realistic Nigerian Naira (₦) pricing for the Nigerian market:
   - "suggestedPrice": fair single price
   - "priceCorridor": { "low": number, "recommended": number, "high": number }
6. Extract key "itemSpecifics": key-value map of specifications (e.g. Brand, Model, Storage, Color, Power, etc.).
7. Note honest "flawDescription" if second-hand (e.g. minor scratches, no original box), or empty string if brand new.
8. Provide "preferredMeetupAdvice" recommending safe public spots tailored to whether the item is bulky (plazas/parking lots) or compact (banks/malls).

Output strictly valid JSON with no markdown formatting:
{
  "title": "string",
  "description": "string",
  "category": "string",
  "condition": "string",
  "suggestedPrice": number,
  "priceCorridor": {
    "low": number,
    "recommended": number,
    "high": number
  },
  "itemSpecifics": {
    "Brand": "string",
    "Model": "string"
  },
  "flawDescription": "string",
  "preferredMeetupAdvice": "string"
}
`;

  const contents = [];
  if (imageBase64 && mimeType) {
    contents.push({
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    });
  }
  contents.push(promptText);

  const res = await ai.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: contents,
  });

  let raw = res.text.trim();
  if (raw.startsWith('```json')) raw = raw.slice(7);
  if (raw.startsWith('```')) raw = raw.slice(3);
  if (raw.endsWith('```')) raw = raw.slice(0, -3);

  return JSON.parse(raw.trim());
}
