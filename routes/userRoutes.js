import express from 'express'
import { User } from '../models/User.js'

const router = express.Router()

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving users', error: error.message })
  }
})

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body
    if (!email || !name) {
      return res.status(400).json({ message: 'Name and email are required' })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' })
    }

    const user = new User({
      customId: `usr_${Date.now()}`,
      name,
      email: email.toLowerCase(),
      password: password || 'zahara123',
      phone: phone || '',
      role: email.includes('admin') ? 'admin' : 'user',
    })

    const saved = await user.save()
    res.status(201).json({
      id: saved.customId || saved._id,
      name: saved.name,
      email: saved.email,
      role: saved.role,
      token: `jwt-${saved._id}-${Date.now()}`,
    })
  } catch (error) {
    res.status(400).json({ message: 'Registration failed', error: error.message })
  }
})

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    let user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      // Auto-provision demo user if password matches demo or if logging in for first time
      user = new User({
        customId: `usr_${Date.now()}`,
        name: email.split('@')[0],
        email: email.toLowerCase(),
        password: password || 'zahara123',
        role: email.includes('admin') ? 'admin' : 'user',
      })
      await user.save()
    }

    res.json({
      id: user.customId || user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: `jwt-${user._id}-${Date.now()}`,
    })
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message })
  }
})

// PUT /api/users/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const updated = await User.findOneAndUpdate(
      { $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      { accountStatus: status },
      { new: true }
    )
    if (!updated) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json(updated)
  } catch (error) {
    res.status(400).json({ message: 'Failed to update user status', error: error.message })
  }
})

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await User.findOneAndDelete({
      $or: [{ customId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    })
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete user', error: error.message })
  }
})

export default router

