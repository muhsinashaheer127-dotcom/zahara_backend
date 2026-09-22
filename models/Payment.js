import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    customId: { type: String, index: true },
    bookingId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    amount: { type: Number, required: true },
    rentalAmount: { type: Number, default: 0 },
    depositAmount: { type: Number, default: 0 },
    paymentDate: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ['UPI / GPay', 'UPI / PhonePe', 'UPI / Paytm', 'Credit Card', 'Debit Card', 'Net Banking', 'Bank Transfer', 'Cash', 'Other'],
      default: 'UPI / GPay',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Refunded', 'Failed', 'Partial'],
      default: 'Pending',
    },
    transactionId: { type: String, default: '' },
    notes: { type: String, default: '' },
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

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
