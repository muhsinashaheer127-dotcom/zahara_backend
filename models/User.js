import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    customId: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    accountStatus: { type: String, enum: ['Active', 'Blocked', 'Pending'], default: 'Active' },
    avatar: { type: String, default: '' },
    memberSince: { type: String, default: () => new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
    registrationDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    totalBookings: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret.customId || ret._id.toString()
        delete ret.password
        delete ret.__v
        return ret
      },
    },
  }
)

export const User = mongoose.models.User || mongoose.model('User', userSchema)

