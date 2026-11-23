import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    messageType: {
      type: String,
      enum: ['text', 'offer', 'meetup_proposal', 'voice', 'system'],
      default: 'text',
    },
    offer: {
      amount: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'countered'],
        default: 'pending',
      },
      counterAmount: { type: Number, default: 0 },
      isCounter: { type: Boolean, default: false },
      previousAmount: { type: Number, default: 0 },
      note: { type: String, default: '' },
    },
    voice: {
      url: { type: String, default: '' },
      duration: { type: Number, default: 0 },
      mimeType: { type: String, default: 'audio/webm' },
    },
    meetup: {
      spotName: { type: String, default: '' },
      spotType: { type: String, default: '' },
      address: { type: String, default: '' },
      spaceTag: { type: String, default: '' },
      plainDescription: { type: String, default: '' },
      mapUrl: { type: String, default: '' },
      distance: { type: String, default: '' },
      lat: { type: Number },
      lng: { type: Number },
      notes: { type: String, default: '' },
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
