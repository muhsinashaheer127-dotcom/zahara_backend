import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'

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

  console.log('\n[Seed] Connecting to MongoDB Atlas...')
  const connected = await connectDB()

  if (!connected) {
    console.error('\n[Seed] ✗ Database connection failed.')
    console.error('[Seed]   Check MONGODB_URI in .env and whitelist your IP in Atlas.')
    process.exit(1)
  }

  try {
    // Seed all collections
    await upsert(Category, 'customId', SEED_CATEGORIES, 'Categories')
    await upsert(Product,  'slug',     SEED_PRODUCTS,   'Products')
    await upsert(User,     'email',    SEED_USERS,      'Users')
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

    console.log('\n╔══════════════════════════════════════╗')
    console.log('║   ✓ Database seeded successfully!    ║')
    console.log('╚══════════════════════════════════════╝')
    console.log('\n Admin Login: admin@zahara.com / zahara@admin123')
    console.log(' Demo User:   demo@zahara.com / zahara123\n')

    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('\n[Seed] ✗ Error during seeding:', error.message)
    if (mongoose.connection) await mongoose.connection.close()
    process.exit(1)
  }
}

seed()
