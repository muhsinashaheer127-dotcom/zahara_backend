import express from 'express'
import { Category } from '../models/Category.js'

const router = express.Router()

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: 1 })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving categories', error: error.message })
  }
})

// POST /api/categories
router.post('/', async (req, res) => {
  try {
    const data = req.body
    if (!data.slug && data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }
    data.customId = data.customId || data.slug

    const category = new Category(data)
    const saved = await category.save()
    res.status(201).json(saved)
  } catch (error) {
    res.status(400).json({ message: 'Failed to create category', error: error.message })
  }
})

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updated = await Category.findOneAndUpdate(
      { $or: [{ customId: id }, { slug: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      req.body,
      { new: true }
    )
    if (!updated) {
      return res.status(404).json({ message: 'Category not found' })
    }
    res.json(updated)
  } catch (error) {
    res.status(400).json({ message: 'Failed to update category', error: error.message })
  }
})

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await Category.findOneAndDelete({
      $or: [{ customId: id }, { slug: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    })
    if (!deleted) {
      return res.status(404).json({ message: 'Category not found' })
    }
    res.json({ message: 'Category deleted successfully', id })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete category', error: error.message })
  }
})

export default router
