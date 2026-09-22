import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    customId: { type: String, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    bookingId: { type: String, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    comment: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret.customId || ret._id.toString()
        delete ret.__v
        return ret
      },
    },
  }
)

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema)
