import express from 'express'
import { Settings } from '../models/Settings.js'

const router = express.Router()

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({ customId: 'settings_global' })
    if (!settings) {
      settings = await Settings.create({ customId: 'settings_global' })
    }
    res.json(settings)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving settings', error: error.message })
  }
})

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const updated = await Settings.findOneAndUpdate(
      { customId: 'settings_global' },
      { $set: req.body },
      { new: true, upsert: true }
    )
    res.json(updated)
  } catch (error) {
    res.status(400).json({ message: 'Failed to update settings', error: error.message })
  }
})

export default router
