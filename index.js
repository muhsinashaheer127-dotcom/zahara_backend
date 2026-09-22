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
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/api/health', (req, res) => {
  const db = getDBStatus()
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    database: db,
    ...(
      !db.isConnected
        ? {
            actionRequired: 'Add your Public IP to MongoDB Atlas > Network Access',
            publicIP: db.publicIP,
            atlasUrl: 'https://cloud.mongodb.com/',
            diagnoseCommand: 'node server/diagnose.js',
          }
        : {}
    ),
  })
})

// API Routes
// userRoutes handles both /api/users/* AND /api/auth/* (register, login)
app.use('/api/auth',       userRoutes)   // handles /api/auth/login and /api/auth/register
app.use('/api/users',      userRoutes)   // handles /api/users/* (CRUD, profile, status)
app.use('/api/products',   productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/bookings',   bookingRoutes)
app.use('/api/orders',     orderRoutes)
app.use('/api/payments',   paymentRoutes)
app.use('/api/reviews',    reviewRoutes)
app.use('/api/settings',   settingsRoutes)

// 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API route not found: ${req.method} ${req.originalUrl}` })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack)
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message })
})

// Start server and connect to MongoDB
const server = app.listen(PORT, () => {
  console.log(`\n\x1b[32m[Zahara] ✓ Server running on http://localhost:${PORT}\x1b[0m`)
  console.log(`\x1b[36m[Zahara]   Frontend: http://localhost:5173\x1b[0m`)
  console.log(`\x1b[36m[Zahara]   Health:   http://localhost:${PORT}/api/health\x1b[0m`)
  console.log(`\x1b[36m[Zahara]   API:      http://localhost:${PORT}/api\x1b[0m\n`)

  // Connect to MongoDB Atlas (non-blocking so server starts immediately)
  connectDB()
})

export default app
