import express from 'express'
import { Order } from '../models/Order.js'

const router = express.Router()

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 })
    res.json(orders)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving orders', error: error.message })
  }
})

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findOne({
      $or: [{ customId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order', error: error.message })
  }
})

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const order = new Order({
      ...req.body,
      customId: req.body.customId || `ORD-${Date.now()}`,
    })
    const saved = await order.save()
    res.status(201).json(saved)
  } catch (error) {
    res.status(400).json({ message: 'Failed to create order', error: error.message })
  }
})

// PUT /api/orders/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, isOverdue } = req.body
    const updated = await Order.findOneAndUpdate(
      { $or: [{ customId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }] },
      { ...(status && { status }), ...(isOverdue !== undefined && { isOverdue }) },
      { new: true }
    )
    if (!updated) return res.status(404).json({ message: 'Order not found' })
    res.json(updated)
  } catch (error) {
    res.status(400).json({ message: 'Failed to update order status', error: error.message })
  }
})

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    await Order.findOneAndDelete({
      $or: [{ customId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    })
    res.json({ message: 'Order deleted' })
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete order', error: error.message })
  }
})

export default router
