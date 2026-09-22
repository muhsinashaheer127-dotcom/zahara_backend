import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
  {
    customId: { type: String, index: true },
    bookingId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    productName: { type: String, required: true },
    productId: { type: String },
    dispatchDate: { type: String, default: '' },
    deliveryDate: { type: String, required: true },
    returnDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['Packed', 'Ready for Dispatch', 'In Transit', 'Delivered', 'Return Initiated', 'Returned', 'Cancelled'],
      default: 'Packed',
    },
    isOverdue: { type: Boolean, default: false },
    trackingCode: { type: String, default: '' },
    deliveryAddress: { type: Object, default: {} },
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

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)
