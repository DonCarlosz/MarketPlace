import { chatWithAssistant, draftListingCoPilot } from '../services/aiService.js';

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with the Universal Platform AI Assistant (Platform Q&A & Conversational Search)
 * @access  Public / Optional Auth
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

    const userContext = {
      name: req.user?.name || context?.userName || 'Guest User',
      city: req.user?.location?.city || context?.userCity || 'Nigeria',
    };

    const result = await chatWithAssistant({ messages, userContext });

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
 * @access  Private
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

    const draft = await draftListingCoPilot({
      prompt: prompt || '',
      category: category || '',
      mode: mode || 'second-hand',
      imageBase64: imageBase64 || null,
      mimeType: mimeType || null,
    });

    res.json({
      success: true,
      draft,
    });
  } catch (error) {
    next(error);
  }
};
