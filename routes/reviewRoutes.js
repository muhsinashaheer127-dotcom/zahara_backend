import express from 'express'
import { storeReviews } from '../data/store.js'
import { authenticateUser, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/reviews — admin only
router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const reviews = await storeReviews.find()
    res.json(reviews)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 500).json({
      success: false, message: error.message,
    })
  }
})

// POST /api/reviews — authenticated user
router.post('/', authenticateUser, async (req, res) => {
  try {
    const data = req.body
    data.customId = data.customId || `RVW-${Date.now()}`
    if (!data.customerEmail && req.user.email) data.customerEmail = req.user.email
    if (!data.customerName  && req.user.name)  data.customerName  = req.user.name

    const saved = await storeReviews.create(data)
    res.status(201).json(saved)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 400).json({
      success: false, message: error.message,
    })
  }
})

// PUT /api/reviews/:id/status — admin only
router.put('/:id/status', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const updated = await storeReviews.updateStatus(id, status)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Review not found.' })
    }
    res.json(updated)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 400).json({
      success: false, message: error.message,
    })
  }
})

// DELETE /api/reviews/:id — admin only
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const success = await storeReviews.delete(id)
    if (!success) {
      return res.status(404).json({ success: false, message: 'Review not found.' })
    }
    res.json({ success: true, message: 'Review deleted successfully.' })
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 500).json({
      success: false, message: error.message,
    })
  }
})

export default router
