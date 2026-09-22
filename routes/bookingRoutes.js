import express from 'express'
import { Booking } from '../models/Booking.js'

const router = express.Router()

// GET /api/bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 })
    res.json(bookings)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving bookings', error: error.message })
  }
})

// GET /api/bookings/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const booking = await Booking.findOne({
      $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    })
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' })
    }
    res.json(booking)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving booking', error: error.message })
  }
})

// POST /api/bookings
router.post('/', async (req, res) => {
  try {
    const data = req.body
    data.customId = data.customId || `ZH-BK-${Math.floor(1000 + Math.random() * 9000)}`

    const booking = new Booking(data)
    const saved = await booking.save()
    res.status(201).json({ success: true, booking: saved, bookingId: saved.customId })
  } catch (error) {
    res.status(400).json({ message: 'Failed to create booking', error: error.message })
  }
})

// PUT /api/bookings/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status, paymentStatus } = req.body
    const update = {}
    if (status) update.status = status
    if (paymentStatus) update.paymentStatus = paymentStatus

    const updated = await Booking.findOneAndUpdate(
      { $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      update,
      { new: true }
    )
    if (!updated) {
      return res.status(404).json({ message: 'Booking not found' })
    }
    res.json(updated)
  } catch (error) {
    res.status(400).json({ message: 'Failed to update booking status', error: error.message })
  }
})

export default router
