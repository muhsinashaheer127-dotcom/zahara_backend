import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  date: { type: String },
  text: { type: String, required: true },
})

const productSchema = new mongoose.Schema(
  {
    customId: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, required: true, index: true },
    occasion: { type: String },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, default: 3 },
    deposit: { type: Number, default: 0 },
    marketValue: { type: Number, default: 0 },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    isNewItem: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    offerBadge: { type: String, default: '' },
    availability: {
      type: String,
      enum: ['available', 'limited', 'out_of_stock', 'rented', 'maintenance', 'reserved', 'unavailable'],
      default: 'available',
    },
    availableQuantity: { type: Number, default: 1 },
    estimatedDelivery: { type: String, default: '2-3 days' },
    sizes: [{ type: String }],
    images: [{ type: String }],
    description: { type: String, default: '' },
    specifications: {
      material: { type: String, default: '' },
      stones: { type: String, default: '' },
      weight: { type: String, default: '' },
      care: { type: String, default: '' },
      finish: { type: String, default: '' },
      insurance: { type: String, default: 'Included' },
    },
    customerReviews: [reviewSchema],
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

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema)
