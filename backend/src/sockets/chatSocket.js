import Conversation from '../models/Conversation.js';
import { verifyAccessToken } from '../utils/token.js';

export const setupChatSocket = (io) => {
  // Attach optional JWT authentication to every socket connection
  // Public feed broadcasts (listing_created, etc.) remain available to guests,
  // while private chat rooms strictly enforce authenticated participant verification.
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        socket.userId = decoded.id?.toString() || null;
      } catch {
        socket.userId = null;
      }
    } else {
      socket.userId = null;
    }
    next();
  });

  io.on('connection', (socket) => {
    // Allow re-authenticating socket after client logs in without page reload
    socket.on('authenticate', ({ token }) => {
      if (!token || typeof token !== 'string') {
        socket.userId = null;
        return;
      }
      try {
        const decoded = verifyAccessToken(token);
        socket.userId = decoded.id?.toString() || null;
      } catch {
        socket.userId = null;
      }
    });

    // Join a private conversation room ONLY if authenticated AND verified participant
    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        if (!conversationId || typeof conversationId !== 'string' || !socket.userId) {
          return;
        }
        const conversation = await Conversation.findById(conversationId).select('participants').lean();
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.userId
        );
        if (!isParticipant) return;

        socket.join(`conv_${conversationId}`);
      } catch {
        // Invalid ObjectId or DB error: ignore silently
      }
    });

    // Leave a conversation room
    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId && typeof conversationId === 'string') {
        socket.leave(`conv_${conversationId}`);
      }
    });

    // Typing indicators: only emit if socket is already an authorized member of the room
    socket.on('typing', ({ conversationId, userName }) => {
      const room = `conv_${conversationId}`;
      if (socket.userId && socket.rooms.has(room)) {
        socket.to(room).emit('user_typing', {
          userName: typeof userName === 'string' ? userName.slice(0, 60) : 'Member',
        });
      }
    });

    socket.on('stop_typing', ({ conversationId }) => {
      const room = `conv_${conversationId}`;
      if (socket.userId && socket.rooms.has(room)) {
        socket.to(room).emit('user_stop_typing');
      }
    });

    socket.on('disconnect', () => {});
  });
};
