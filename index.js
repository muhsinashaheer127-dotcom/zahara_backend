import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB, getDBStatus } from './config/db.js'

// Routes
import productRoutes  from './routes/productRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import bookingRoutes  from './routes/bookingRoutes.js'
import userRoutes     from './routes/userRoutes.js'
import orderRoutes    from './routes/orderRoutes.js'
import paymentRoutes  from './routes/paymentRoutes.js'
import reviewRoutes   from './routes/reviewRoutes.js'
import settingsRoutes from './routes/settingsRoutes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const app  = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  const db = getDBStatus()
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    database: db,
  })
})

// API Routes
app.use('/api/products',   productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/bookings',   bookingRoutes)
app.use('/api/users',      userRoutes)
app.use('/api/orders',     orderRoutes)
app.use('/api/payments',   paymentRoutes)
app.use('/api/reviews',    reviewRoutes)
app.use('/api/settings',   settingsRoutes)
app.use('/api',            userRoutes) // handles /api/auth/login and /api/auth/register

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack)
  res.status(500).json({ message: 'Internal Server Error', error: err.message })
})

// Start server
const startServer = async () => {
  console.log(`\n[Zahara] Starting server on port ${PORT}...`)

  await connectDB()

  app.listen(PORT, () => {
    console.log(`\x1b[32m[Zahara] Server running on http://localhost:${PORT}\x1b[0m`)
    console.log(`\x1b[36m[Zahara] Health check: http://localhost:${PORT}/api/health\x1b[0m`)
    console.log(`\x1b[36m[Zahara] API endpoints:\x1b[0m`)
    console.log(`         /api/products | /api/categories | /api/bookings`)
    console.log(`         /api/users    | /api/orders     | /api/payments`)
    console.log(`         /api/reviews  | /api/settings   | /api/auth/*`)
  })
}

startServer()
