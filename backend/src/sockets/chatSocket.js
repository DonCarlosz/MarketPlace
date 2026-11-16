export const setupChatSocket = (io) => {
  io.on('connection', (socket) => {
    // Join a conversation room
    socket.on('join_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.join(`conv_${conversationId}`);
      }
    });

    // Leave a conversation room
    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conv_${conversationId}`);
      }
    });

    // Typing indicators
    socket.on('typing', ({ conversationId, userName }) => {
      socket.to(`conv_${conversationId}`).emit('user_typing', { userName });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit('user_stop_typing');
    });

    socket.on('disconnect', () => {});
  });
};
