import { chatWithAssistant, draftListingCoPilot } from '../services/aiService.js';

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with the Universal Platform AI Assistant (Platform Q&A & Conversational Search)
 * @access  Public / Optional Auth (Rate-Limited)
 */
export const chatWithAssistantController = async (req, res, next) => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid messages array is required.',
      });
    }

    // Cap message history & per-message length to prevent token/quota DoS
    const sanitizedMessages = messages
      .slice(-10)
      .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content.trim().slice(0, 1000),
      }));

    if (sanitizedMessages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid message.',
      });
    }

    const rawRoute =
      typeof context?.currentRoute === 'string' ? context.currentRoute.trim().slice(0, 140) : '/';
    const listingRouteMatch = rawRoute.match(/^\/listing\/([a-f0-9]{24})/i);

    const userContext = {
      name:
        req.user?.name ||
        (typeof context?.userName === 'string' ? context.userName.trim().slice(0, 60) : 'Guest User'),
      city:
        req.user?.location?.city ||
        (typeof context?.userCity === 'string' ? context.userCity.trim().slice(0, 60) : 'Nigeria'),
      currentRoute: rawRoute,
      currentListingId: listingRouteMatch ? listingRouteMatch[1] : null,
    };

    const result = await chatWithAssistant({ messages: sanitizedMessages, userContext });

    res.json({
      success: true,
      reply: result.reply,
      listings: result.listings || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/ai/draft-listing
 * @desc    Listing Wizard Co-Pilot: Auto-draft titles, descriptions, categories, and price corridors
 * @access  Private (Rate-Limited)
 */
export const draftListingController = async (req, res, next) => {
  try {
    const { prompt, category, mode, imageBase64, mimeType } = req.body;

    if (!prompt && !imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either item notes/description or an image to analyze.',
      });
    }

    if (typeof imageBase64 === 'string' && imageBase64.length > 4 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image payload is too large for AI analysis. Please use a smaller image.',
      });
    }

    const draft = await draftListingCoPilot({
      prompt: typeof prompt === 'string' ? prompt.trim().slice(0, 1500) : '',
      category: typeof category === 'string' ? category.trim().slice(0, 80) : '',
      mode: ['second-hand', 'new', 'service'].includes(mode) ? mode : 'second-hand',
      imageBase64: typeof imageBase64 === 'string' ? imageBase64 : null,
      mimeType: typeof mimeType === 'string' && mimeType.startsWith('image/') ? mimeType : null,
    });

    res.json({
      success: true,
      draft,
    });
  } catch (error) {
    next(error);
  }
};
