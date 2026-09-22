import express from 'express'
import { Payment } from '../models/Payment.js'

const router = express.Router()

// GET /api/payments
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 })
    res.json(payments)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving payments', error: error.message })
  }
})

// GET /api/payments/:id
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findOne({
      $or: [{ customId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    })
    if (!payment) return res.status(404).json({ message: 'Payment not found' })
    res.json(payment)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving payment', error: error.message })
  }
})

// POST /api/payments
router.post('/', async (req, res) => {
  try {
    const payment = new Payment({
      ...req.body,
      customId: req.body.customId || `PAY-${Date.now()}`,
    })
    const saved = await payment.save()
    res.status(201).json(saved)
  } catch (error) {
    res.status(400).json({ message: 'Failed to create payment', error: error.message })
  }
})

// PUT /api/payments/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { paymentStatus, notes } = req.body
    const updated = await Payment.findOneAndUpdate(
      { $or: [{ customId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }] },
      { ...(paymentStatus && { paymentStatus }), ...(notes !== undefined && { notes }) },
      { new: true }
    )
    if (!updated) return res.status(404).json({ message: 'Payment not found' })
    res.json(updated)
  } catch (error) {
    res.status(400).json({ message: 'Failed to update payment', error: error.message })
  }
})

export default router
