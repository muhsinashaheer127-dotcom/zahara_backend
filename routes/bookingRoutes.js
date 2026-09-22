import express from 'express'
import { storeBookings } from '../data/store.js'
import { authenticateUser, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

const dbStatus = (err) => err.message.includes('not connected') ? 503 : 500

// GET /api/bookings — admin sees all; authenticated user sees their own
router.get('/', authenticateUser, async (req, res) => {
  try {
    const filter = {}
    // Non-admin users can only see their own bookings
    if (req.user.role !== 'admin') {
      filter.userId = req.user.email
    }
    const bookings = await storeBookings.find(filter)
    res.json(bookings)
  } catch (error) {
    res.status(dbStatus(error)).json({ success: false, message: error.message })
  }
})

// GET /api/bookings/:id — authenticated
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const booking = await storeBookings.findOne(id)
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' })
    }
    // Non-admins can only see their own booking
    if (req.user.role !== 'admin' && booking.customerEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Access denied.' })
    }
    res.json(booking)
  } catch (error) {
    res.status(dbStatus(error)).json({ success: false, message: error.message })
  }
})

// POST /api/bookings — authenticated user
router.post('/', authenticateUser, async (req, res) => {
  try {
    const data = req.body
    data.customId = data.customId || `ZH-BK-${Math.floor(1000 + Math.random() * 9000)}`
    // Attach the logged-in user's info
    if (!data.customerEmail && req.user.email) data.customerEmail = req.user.email
    if (!data.customerName  && req.user.name)  data.customerName  = req.user.name
    data.userId = req.user.email

    const saved = await storeBookings.create(data)
    res.status(201).json({ success: true, booking: saved, bookingId: saved.customId })
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 400).json({
      success: false,
      message: 'Failed to create booking. ' + error.message,
    })
  }
})

// PUT /api/bookings/:id/status — admin only
router.put('/:id/status', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status, paymentStatus } = req.body

    const updated = await storeBookings.updateStatus(id, status, paymentStatus)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Booking not found.' })
    }
    res.json(updated)
  } catch (error) {
    res.status(dbStatus(error)).json({ success: false, message: error.message })
  }
})

export default router
