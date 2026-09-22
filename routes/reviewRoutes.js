import express from 'express'
import { Review } from '../models/Review.js'

const router = express.Router()

// GET /api/reviews
router.get('/', async (req, res) => {
  try {
    const { productId, status } = req.query
    const filter = {}
    if (productId) filter.productId = productId
    if (status) filter.status = status
    const reviews = await Review.find(filter).sort({ createdAt: -1 })
    res.json(reviews)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving reviews', error: error.message })
  }
})

// POST /api/reviews
router.post('/', async (req, res) => {
  try {
    const review = new Review({
      ...req.body,
      customId: req.body.customId || `REV-${Date.now()}`,
    })
    const saved = await review.save()
    res.status(201).json(saved)
  } catch (error) {
    res.status(400).json({ message: 'Failed to create review', error: error.message })
  }
})

// PUT /api/reviews/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const updated = await Review.findOneAndUpdate(
      { $or: [{ customId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }] },
      { status },
      { new: true }
    )
    if (!updated) return res.status(404).json({ message: 'Review not found' })
    res.json(updated)
  } catch (error) {
    res.status(400).json({ message: 'Failed to update review status', error: error.message })
  }
})

// DELETE /api/reviews/:id
router.delete('/:id', async (req, res) => {
  try {
    await Review.findOneAndDelete({
      $or: [{ customId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    })
    res.json({ message: 'Review deleted' })
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete review', error: error.message })
  }
})

export default router
