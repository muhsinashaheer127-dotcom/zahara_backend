import express from 'express'
import { storePayments } from '../data/store.js'
import { authenticateUser, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/payments — admin only
router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const payments = await storePayments.find()
    res.json(payments)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 500).json({
      success: false, message: error.message,
    })
  }
})

// PUT /api/payments/:id/status — admin only
router.put('/:id/status', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { paymentStatus } = req.body

    const updated = await storePayments.updateStatus(id, paymentStatus)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Payment not found.' })
    }
    res.json(updated)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 400).json({
      success: false, message: error.message,
    })
  }
})

export default router
