import express from 'express'
import { storeCategories } from '../data/store.js'
import { authenticateUser, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

const dbError = (error) => ({
  success: false,
  message: error.message.includes('not connected')
    ? 'Database unavailable. Please ensure the backend is connected to MongoDB.'
    : error.message,
  error: error.message,
})

// GET /api/categories — public
router.get('/', async (req, res) => {
  try {
    const categories = await storeCategories.find()
    res.json(categories)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 500).json(dbError(error))
  }
})

// POST /api/categories — admin only
router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const data = req.body
    if (!data.slug && data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }
    data.customId = data.customId || data.slug

    const saved = await storeCategories.create(data)
    res.status(201).json(saved)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 400).json(dbError(error))
  }
})

// PUT /api/categories/:id — admin only
router.put('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const updated = await storeCategories.update(id, req.body)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Category not found.' })
    }
    res.json(updated)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 400).json(dbError(error))
  }
})

// DELETE /api/categories/:id — admin only
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const success = await storeCategories.delete(id)
    if (!success) {
      return res.status(404).json({ success: false, message: 'Category not found.' })
    }
    res.json({ success: true, message: 'Category deleted successfully.', id })
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 500).json(dbError(error))
  }
})

export default router
