import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    customId: { type: String, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    productId: { type: String },
    productName: { type: String, required: true },
    productImage: { type: String, default: '' },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    rentalDays: { type: Number, default: 3 },
    rentalAmount: { type: Number, required: true },
    securityDeposit: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    deliveryAddress: { type: Object, default: {} },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Active', 'Returned', 'Cancelled'],
      default: 'Confirmed',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Refunded'],
      default: 'Paid',
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

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema)
