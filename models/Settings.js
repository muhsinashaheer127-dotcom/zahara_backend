import mongoose from 'mongoose'

const settingsSchema = new mongoose.Schema(
  {
    customId: { type: String, default: 'settings_global', index: true },
    siteName: { type: String, default: 'Zahara Rental Jewellery' },
    adminEmail: { type: String, default: 'zahararental@gmail.com' },
    contactPhone: { type: String, default: '+91 9747133559' },
    currency: { type: String, default: '₹' },
    minRentalDays: { type: Number, default: 3 },
    maxRentalDays: { type: Number, default: 14 },
    depositMultiplier: { type: Number, default: 1.0 },
    lateFeePerDay: { type: Number, default: 500 },
    deliveryCharge: { type: Number, default: 0 },
    freeDeliveryAbove: { type: Number, default: 1000 },
    notificationsEnabled: { type: Boolean, default: true },
    emailAlerts: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
    paymentGatewayTestMode: { type: Boolean, default: false },
    allowedPaymentMethods: [{ type: String }],
    instagramUrl: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    address: { type: String, default: 'Kerala, India' },
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

export const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema)
