import express from 'express'
import { storeOrders } from '../data/store.js'
import { authenticateUser, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/orders — admin only
router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const orders = await storeOrders.find()
    res.json(orders)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 500).json({
      success: false, message: error.message,
    })
  }
})

// PUT /api/orders/:id/status — admin only
router.put('/:id/status', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const updated = await storeOrders.updateStatus(id, status)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Order not found.' })
    }
    res.json(updated)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 400).json({
      success: false, message: error.message,
    })
  }
})

export default router
