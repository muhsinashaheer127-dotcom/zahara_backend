import express from 'express'
import { storeProducts } from '../data/supabase-store.js'
import { SEED_PRODUCTS } from '../data/products.js'
import { isDBConnected } from '../config/supabase-db.js'
import { authenticateUser, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/products — public
router.get('/', async (req, res) => {
  try {
    const { category, search, occasion } = req.query
    
    // Fallback to local data if database is not connected
    if (!isDBConnected()) {
      console.log('[Products] Using local fallback data (database not connected)')
      let products = [...SEED_PRODUCTS]
      
      if (category) {
        products = products.filter(p => p.category === category)
      }
      if (search) {
        products = products.filter(p => 
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
        )
      }
      if (occasion) {
        products = products.filter(p => p.occasion === occasion)
      }
      
      return res.json(products)
    }
    
    const products = await storeProducts.find({ category, search, occasion })
    res.json(products)
  } catch (error) {
    // Fallback to local data on error
    console.log('[Products] Error fetching from database, using fallback:', error.message)
    let products = [...SEED_PRODUCTS]
    
    const { category, search, occasion } = req.query
    if (category) {
      products = products.filter(p => p.category === category)
    }
    if (search) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (occasion) {
      products = products.filter(p => p.occasion === occasion)
    }
    
    res.json(products)
  }
})

// GET /api/products/:idOrSlug — public
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params
    const product = await storeProducts.findOne(idOrSlug)
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' })
    }
    res.json(product)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 500).json({
      success: false,
      message: 'Error retrieving product.',
      error: error.message,
    })
  }
})

// POST /api/products — admin only
router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const data = req.body
    if (!data.name || !data.price) {
      return res.status(400).json({ success: false, message: 'Product name and price are required.' })
    }
    if (!data.slug && data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }
    data.customId = data.customId || `PRD-${Date.now()}`

    const saved = await storeProducts.create(data)
    res.status(201).json(saved)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 400).json({
      success: false,
      message: 'Failed to create product.',
      error: error.message,
    })
  }
})

// PUT /api/products/:id — admin only
router.put('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const updated = await storeProducts.update(id, req.body)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Product not found.' })
    }
    res.json(updated)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 400).json({
      success: false,
      message: 'Failed to update product.',
      error: error.message,
    })
  }
})

// DELETE /api/products/:id — admin only
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const success = await storeProducts.delete(id)
    if (!success) {
      return res.status(404).json({ success: false, message: 'Product not found.' })
    }
    res.json({ success: true, message: 'Product deleted successfully.', id })
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 500).json({
      success: false,
      message: 'Failed to delete product.',
      error: error.message,
    })
  }
})

export default router
