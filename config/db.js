import mongoose from 'mongoose'

// Disable query buffering so disconnected queries fail fast rather than hanging
mongoose.set('bufferCommands', false)

let isConnected = false
let isConnecting = false
let reconnectTimer = null
let detectedPublicIP = null

// Fetch public IP asynchronously for diagnostics
fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) })
  .then((r) => r.json())
  .then((d) => { detectedPublicIP = d.ip })
  .catch(() => {})


/**
 * Auto-seed collections if empty after a successful MongoDB connection.
 */
async function autoSeedIfEmpty() {
  // Lazy import to avoid circular deps and keep seed data server-side only
  const { SEED_CATEGORIES } = await import('../data/categories.js')
  const { SEED_PRODUCTS }   = await import('../data/products.js')
  const { SEED_USERS }      = await import('../data/users.js')
  const { SEED_BOOKINGS }   = await import('../data/bookings.js')
  const { SEED_ORDERS }     = await import('../data/orders.js')
  const { SEED_PAYMENTS }   = await import('../data/payments.js')
  const { SEED_REVIEWS }    = await import('../data/reviews.js')
  const { SEED_SETTINGS }   = await import('../data/settings.js')
  const { Category } = await import('../models/Category.js')
  const { Product }  = await import('../models/Product.js')
  const { User }     = await import('../models/User.js')
  const { Booking }  = await import('../models/Booking.js')
  const { Order }    = await import('../models/Order.js')
  const { Payment }  = await import('../models/Payment.js')
  const { Review }   = await import('../models/Review.js')
  const { Settings } = await import('../models/Settings.js')

  try {
    const productCount = await Product.countDocuments()
    if (productCount === 0) {
      console.log('\x1b[36m[MongoDB] Database is empty. Auto-seeding initial data...\x1b[0m')
      // Import bcrypt for hashing seed user passwords
      const bcrypt = await import('bcryptjs')
      const seededUsers = await Promise.all(
        SEED_USERS.map(async (u) => ({
          ...u,
          password: await bcrypt.default.hash(u.password, 12),
        }))
      )
      await Promise.all([
        Category.insertMany(SEED_CATEGORIES).catch(() => {}),
        Product.insertMany(SEED_PRODUCTS).catch(() => {}),
        User.insertMany(seededUsers).catch(() => {}),
        Booking.insertMany(SEED_BOOKINGS).catch(() => {}),
        Order.insertMany(SEED_ORDERS).catch(() => {}),
        Payment.insertMany(SEED_PAYMENTS).catch(() => {}),
        Review.insertMany(SEED_REVIEWS).catch(() => {}),
        Settings.findOneAndUpdate({ customId: 'settings_global' }, SEED_SETTINGS, { upsert: true }).catch(() => {}),
      ])
      console.log('\x1b[32m[MongoDB] Initial data seeded successfully!\x1b[0m')
      console.log('\x1b[32m[MongoDB] Admin: admin@zahara.com / zahara@admin123\x1b[0m')
      console.log('\x1b[32m[MongoDB] Demo:  demo@zahara.com / zahara123\x1b[0m')
    }
  } catch (err) {
    console.warn('[MongoDB] Auto-seed warning:', err.message)
  }
}


/**
 * Connect to MongoDB Atlas (non-blocking)
 */
export const connectDB = async () => {
  if (isConnected || isConnecting) {
    return isConnected
  }

  const uri = process.env.MONGODB_URI

  if (!uri || uri.includes('<db_password>') || uri.includes('<password>')) {
    console.warn('\x1b[33m[MongoDB] MONGODB_URI is not configured with real credentials in .env.\x1b[0m')
    console.warn('\x1b[33m[MongoDB] Running in Local In-Memory Fallback Mode.\x1b[0m')
    return false
  }

  isConnecting = true

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
    })

    isConnected = true
    isConnecting = false
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    console.log(`\x1b[32m[MongoDB] ✓ Connected successfully to: ${conn.connection.host}\x1b[0m`)
    console.log(`\x1b[32m[MongoDB] ✓ Database: ${conn.connection.name}\x1b[0m`)

    // Seed database if empty
    autoSeedIfEmpty()

    // Listen for disconnections
    mongoose.connection.on('disconnected', () => {
      isConnected = false
      console.warn('\x1b[33m[MongoDB] Connection lost. Reconnecting in 20s...\x1b[0m')
      console.warn('\x1b[33m[MongoDB] DB-dependent API calls will return 503 until reconnected.\x1b[0m')
      scheduleReconnect()
    })

    return true
  } catch (error) {
    isConnected = false
    isConnecting = false

    console.error(`\x1b[31m[MongoDB] Connection FAILED: ${error.message}\x1b[0m`)
    if (error.message.includes('alert number 80') || error.message.includes('whitelist') || error.message.includes('ReplicaSetNoPrimary')) {
      console.error(`\x1b[31m[MongoDB] ➔ Your IP is NOT whitelisted in MongoDB Atlas.\x1b[0m`)
      console.error(`\x1b[31m[MongoDB] ➔ Current Public IP: ${detectedPublicIP || 'Detecting...'}\x1b[0m`)
      console.error(`\x1b[31m[MongoDB] ➔ Go to: https://cloud.mongodb.com/ > Network Access > Add IP Address\x1b[0m`)
      console.error(`\x1b[31m[MongoDB] ➔ Run "node server/diagnose.js" for detailed diagnostics.\x1b[0m`)
    }
    console.warn('\x1b[33m[MongoDB] Database unavailable — all DB-dependent API calls will return 503 errors.\x1b[0m')

    scheduleReconnect()
    return false
  }
}

function scheduleReconnect() {
  if (!reconnectTimer) {
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      console.log('[MongoDB] Attempting background reconnection to Atlas...')
      connectDB()
    }, 20000)
  }
}

export const isDBConnected = () => isConnected && mongoose.connection.readyState === 1

export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }
  const readyState = mongoose.connection.readyState
  return {
    state: states[readyState] || 'disconnected',
    isConnected: readyState === 1,
    host: readyState === 1 ? mongoose.connection.host : null,
    name: readyState === 1 ? mongoose.connection.name : null,
    publicIP: detectedPublicIP,
    fallbackMode: readyState !== 1,
  }
}
