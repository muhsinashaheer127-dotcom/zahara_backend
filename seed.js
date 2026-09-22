import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// Models
import { Category } from './models/Category.js'
import { Product }  from './models/Product.js'
import { User }     from './models/User.js'
import { Booking }  from './models/Booking.js'
import { Order }    from './models/Order.js'
import { Payment }  from './models/Payment.js'
import { Review }   from './models/Review.js'
import { Settings } from './models/Settings.js'

// Seed Data
import { SEED_CATEGORIES } from './data/categories.js'
import { SEED_PRODUCTS }   from './data/products.js'
import { SEED_USERS }      from './data/users.js'
import { SEED_BOOKINGS }   from './data/bookings.js'
import { SEED_ORDERS }     from './data/orders.js'
import { SEED_PAYMENTS }   from './data/payments.js'
import { SEED_REVIEWS }    from './data/reviews.js'
import { SEED_SETTINGS }   from './data/settings.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const upsert = async (Model, matchKey, items, label) => {
  console.log(`\n[Seed] Seeding ${items.length} ${label}...`)
  let created = 0, updated = 0
  for (const item of items) {
    const filter = { [matchKey]: item[matchKey] }
    const existing = await Model.findOne(filter)
    if (existing) {
      await Model.findOneAndUpdate(filter, item, { new: true })
      updated++
    } else {
      await new Model(item).save()
      created++
    }
  }
  console.log(`   ✔ ${label}: ${created} created, ${updated} updated`)
}

const seed = async () => {
  console.log('\n╔══════════════════════════════════════╗')
  console.log('║      Zahara Database Seed Script      ║')
  console.log('╚══════════════════════════════════════╝')

  const uri = process.env.MONGODB_URI
  if (!uri || uri.includes('<password>') || uri.includes('<db_password>')) {
    console.error('\n[Seed] ✗ MONGODB_URI is not properly configured in .env')
    process.exit(1)
  }

  console.log('\n[Seed] Connecting to MongoDB Atlas...')

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    })
    console.log(`\x1b[32m[Seed] ✓ Connected to: ${conn.connection.host}\x1b[0m`)
  } catch (err) {
    console.error('\n[Seed] ✗ MongoDB connection failed:', err.message)
    if (err.message.includes('alert number 80')) {
      console.error('[Seed]   Your IP is not whitelisted in MongoDB Atlas.')
      console.error('[Seed]   Go to: https://cloud.mongodb.com/ > Network Access > Add IP')
    }
    process.exit(1)
  }

  try {
    // Hash passwords for seed users
    console.log('\n[Seed] Hashing user passwords with bcrypt...')
    const hashedUsers = await Promise.all(
      SEED_USERS.map(async (u) => ({
        ...u,
        password: await bcrypt.hash(u.password, 12),
      }))
    )

    // Seed all collections
    await upsert(Category, 'customId', SEED_CATEGORIES, 'Categories')
    await upsert(Product,  'slug',     SEED_PRODUCTS,   'Products')
    await upsert(User,     'email',    hashedUsers,     'Users (with hashed passwords)')
    await upsert(Booking,  'customId', SEED_BOOKINGS,   'Bookings')
    await upsert(Order,    'customId', SEED_ORDERS,     'Orders')
    await upsert(Payment,  'customId', SEED_PAYMENTS,   'Payments')
    await upsert(Review,   'customId', SEED_REVIEWS,    'Reviews')

    // Settings: singleton upsert
    console.log('\n[Seed] Seeding Settings...')
    await Settings.findOneAndUpdate(
      { customId: 'settings_global' },
      SEED_SETTINGS,
      { upsert: true, new: true }
    )
    console.log('   ✔ Settings: upserted')

    console.log('\n╔══════════════════════════════════════════╗')
    console.log('║   ✓ Database seeded successfully!        ║')
    console.log('╚══════════════════════════════════════════╝')
    console.log('\n Admin Login: admin@zahara.com / zahara@admin123')
    console.log(' Demo User:   demo@zahara.com  / zahara123\n')

    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('\n[Seed] ✗ Error during seeding:', error.message)
    if (mongoose.connection) await mongoose.connection.close()
    process.exit(1)
  }
}

seed()
