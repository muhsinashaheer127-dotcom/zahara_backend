/**
 * store.js
 * All database operations go directly to MongoDB.
 * No in-memory fallback — if the database is unavailable, operations throw errors.
 * The frontend receives a clear error message instead of fake local data.
 */
import { isDBConnected } from '../config/db.js'

// Mongoose Models
import { Product }  from '../models/Product.js'
import { Category } from '../models/Category.js'
import { Booking }  from '../models/Booking.js'
import { Order }    from '../models/Order.js'
import { Payment }  from '../models/Payment.js'
import { Review }   from '../models/Review.js'
import { Settings } from '../models/Settings.js'

/** Throw a clear error when DB is not connected */
const requireDB = () => {
  if (!isDBConnected()) {
    throw new Error('Database is not connected. Please ensure MongoDB Atlas is reachable and your IP is whitelisted.')
  }
}

/* =========================================================================
   PRODUCTS
   ========================================================================= */
export const storeProducts = {
  find: async (filter = {}) => {
    requireDB()
    const query = {}
    if (filter.category) query.category = { $regex: new RegExp(`^${filter.category}$`, 'i') }
    if (filter.occasion) query.occasion  = { $regex: new RegExp(`^${filter.occasion}$`, 'i') }
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } },
      ]
    }
    return await Product.find(query).sort({ createdAt: -1 })
  },

  findOne: async (idOrSlug) => {
    requireDB()
    const target = String(idOrSlug).toLowerCase()
    let product = await Product.findOne({ slug: target })
    if (!product) {
      product = await Product.findOne({
        $or: [
          { customId: idOrSlug },
          { _id: idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? idOrSlug : null },
        ],
      })
    }
    return product || null
  },

  create: async (data) => {
    requireDB()
    const product = new Product(data)
    return await product.save()
  },

  update: async (id, data) => {
    requireDB()
    const updated = await Product.findOneAndUpdate(
      {
        $or: [
          { customId: id },
          { slug: id.toLowerCase() },
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        ],
      },
      data,
      { new: true, runValidators: true }
    )
    return updated || null
  },

  delete: async (id) => {
    requireDB()
    const deleted = await Product.findOneAndDelete({
      $or: [
        { customId: id },
        { slug: id.toLowerCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    })
    return !!deleted
  },
}

/* =========================================================================
   CATEGORIES
   ========================================================================= */
export const storeCategories = {
  find: async () => {
    requireDB()
    return await Category.find().sort({ createdAt: 1 })
  },

  create: async (data) => {
    requireDB()
    const cat = new Category(data)
    return await cat.save()
  },

  update: async (id, data) => {
    requireDB()
    const updated = await Category.findOneAndUpdate(
      { $or: [{ customId: id }, { slug: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      data,
      { new: true }
    )
    return updated || null
  },

  delete: async (id) => {
    requireDB()
    const deleted = await Category.findOneAndDelete({
      $or: [{ customId: id }, { slug: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    })
    return !!deleted
  },
}

/* =========================================================================
   BOOKINGS
   ========================================================================= */
export const storeBookings = {
  find: async (filter = {}) => {
    requireDB()
    const query = {}
    if (filter.userId) {
      query.$or = [{ customerEmail: filter.userId }, { userId: filter.userId }]
    }
    return await Booking.find(query).sort({ createdAt: -1 })
  },

  findOne: async (id) => {
    requireDB()
    const b = await Booking.findOne({
      $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    })
    return b || null
  },

  create: async (data) => {
    requireDB()
    const booking = new Booking(data)
    return await booking.save()
  },

  updateStatus: async (id, status, paymentStatus) => {
    requireDB()
    const update = {}
    if (status)        update.status        = status
    if (paymentStatus) update.paymentStatus = paymentStatus
    const updated = await Booking.findOneAndUpdate(
      { $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      update,
      { new: true }
    )
    return updated || null
  },
}

/* =========================================================================
   ORDERS
   ========================================================================= */
export const storeOrders = {
  find: async () => {
    requireDB()
    return await Order.find().sort({ createdAt: -1 })
  },

  updateStatus: async (id, status) => {
    requireDB()
    const updated = await Order.findOneAndUpdate(
      { $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      { status },
      { new: true }
    )
    return updated || null
  },
}

/* =========================================================================
   PAYMENTS
   ========================================================================= */
export const storePayments = {
  find: async () => {
    requireDB()
    return await Payment.find().sort({ createdAt: -1 })
  },

  updateStatus: async (id, paymentStatus) => {
    requireDB()
    const updated = await Payment.findOneAndUpdate(
      { $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      { paymentStatus },
      { new: true }
    )
    return updated || null
  },
}

/* =========================================================================
   REVIEWS
   ========================================================================= */
export const storeReviews = {
  find: async () => {
    requireDB()
    return await Review.find().sort({ createdAt: -1 })
  },

  create: async (data) => {
    requireDB()
    const review = new Review(data)
    return await review.save()
  },

  updateStatus: async (id, status) => {
    requireDB()
    const updated = await Review.findOneAndUpdate(
      { $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      { status },
      { new: true }
    )
    return updated || null
  },

  delete: async (id) => {
    requireDB()
    const deleted = await Review.findOneAndDelete({
      $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    })
    return !!deleted
  },
}

/* =========================================================================
   SETTINGS
   ========================================================================= */
export const storeSettings = {
  get: async () => {
    requireDB()
    let settings = await Settings.findOne({ customId: 'settings_global' })
    if (!settings) settings = await Settings.findOne()
    return settings
  },

  save: async (data) => {
    requireDB()
    return await Settings.findOneAndUpdate(
      { customId: 'settings_global' },
      data,
      { upsert: true, new: true }
    )
  },
}
