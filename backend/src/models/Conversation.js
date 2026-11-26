import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    // TikTok-style message request acceptance & anti-spam
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    senderMessageCount: {
      type: Number,
      default: 0,
    },
    // Per-user WhatsApp-style chat deletion (hides chat for deleting user & clears old messages for them)
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    clearedAt: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

conversationSchema.pre('validate', function () {
  const uniqueIds = new Set(
    (this.participants || []).filter(Boolean).map((p) => (p._id || p).toString())
  );
  if (uniqueIds.size < 2) {
    throw new Error('A conversation must have two distinct users.');
  }
  if (
    this.initiator &&
    this.receiver &&
    (this.initiator._id || this.initiator).toString() ===
      (this.receiver._id || this.receiver).toString()
  ) {
    throw new Error('Users cannot start a conversation with themselves.');
  }
});

conversationSchema.index({ participants: 1, listing: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
