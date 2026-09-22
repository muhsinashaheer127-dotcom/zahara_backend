import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    customId: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret.customId || ret.slug || ret._id.toString()
        delete ret.__v
        return ret
      },
    },
  }
)

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema)
