import express from 'express'
import { storeSettings } from '../data/store.js'
import { authenticateUser, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// GET /api/settings — admin only
router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const settings = await storeSettings.get()
    res.json(settings || {})
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 500).json({
      success: false, message: error.message,
    })
  }
})

// PUT /api/settings — admin only
router.put('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const updated = await storeSettings.save(req.body)
    res.json(updated)
  } catch (error) {
    res.status(error.message.includes('not connected') ? 503 : 400).json({
      success: false, message: error.message,
    })
  }
})

export default router
