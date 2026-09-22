import express from 'express'
import { Product } from '../models/Product.js'

const router = express.Router()

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, search, occasion } = req.query
    const query = {}

    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') }
    }
    if (occasion) {
      query.occasion = { $regex: new RegExp(`^${occasion}$`, 'i') }
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const products = await Product.find(query).sort({ createdAt: -1 })
    res.json(products)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving products', error: error.message })
  }
})

// GET /api/products/:idOrSlug
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params
    let product = await Product.findOne({ slug: idOrSlug.toLowerCase() })

    if (!product) {
      product = await Product.findOne({
        $or: [{ customId: idOrSlug }, { _id: idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? idOrSlug : null }],
      })
    }

    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    res.json(product)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving product', error: error.message })
  }
})

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const data = req.body
    if (!data.slug && data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }
    data.customId = data.customId || `PRD-${Date.now()}`

    const product = new Product(data)
    const saved = await product.save()
    res.status(201).json(saved)
  } catch (error) {
    res.status(400).json({ message: 'Failed to create product', error: error.message })
  }
})

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updated = await Product.findOneAndUpdate(
      { $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      req.body,
      { new: true, runValidators: true }
    )
    if (!updated) {
      return res.status(404).json({ message: 'Product not found' })
    }
    res.json(updated)
  } catch (error) {
    res.status(400).json({ message: 'Failed to update product', error: error.message })
  }
})

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await Product.findOneAndDelete({
      $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    })
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' })
    }
    res.json({ message: 'Product deleted successfully', id })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product', error: error.message })
  }
})

export default router
