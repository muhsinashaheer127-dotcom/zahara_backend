import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { storeUsers } from '../data/supabase-store.js'
import { isDBConnected } from '../config/supabase-db.js'
import { authenticateUser, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/** Generate a signed JWT token for a user */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured in .env')
  return jwt.sign(
    { id: user.id, customId: user.customId, email: user.email, role: user.role, name: user.name },
    secret,
    { expiresIn: '7d' }
  )
}

/** Format user response to exclude password */
const formatUserResponse = (user) => {
  const { password, ...userWithoutPassword } = user
  return userWithoutPassword
}

// ─── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  if (!isDBConnected()) {
    return res.status(503).json({ success: false, message: 'Database is not connected. Cannot register user.' })
  }

  try {
    const { name, email, password, phone, address } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' })
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' })
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters.' })
    }

    const cleanEmail = email.toLowerCase().trim()

    const existing = await storeUsers.findOneWithEmail(cleanEmail)
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const userData = {
      customId: `usr_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: phone || '',
      address: address || '',
      role: 'user',
      memberSince: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }

    const saved = await storeUsers.create(userData)
    const token = generateToken(saved)

    res.status(201).json({
      success: true,
      token,
      user: formatUserResponse(saved),
    })
  } catch (error) {
    console.error('[Auth] Register error:', error.message)
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.', error: error.message })
  }
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  if (!isDBConnected()) {
    return res.status(503).json({ success: false, message: 'Database is not connected. Cannot authenticate.' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' })
    }

    const cleanEmail = email.toLowerCase().trim()
    const user = await storeUsers.findOneWithEmail(cleanEmail)

    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with this email address.' })
    }

    if (user.accountStatus === 'Blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' })
    }

    const token = generateToken(user)

    res.json({
      success: true,
      token,
      user: formatUserResponse(user),
    })
  } catch (error) {
    console.error('[Auth] Login error:', error.message)
    res.status(500).json({ success: false, message: 'Login failed. Please try again.', error: error.message })
  }
})

// ─── GET /api/users (admin only) ─────────────────────────────────────────────
router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  if (!isDBConnected()) {
    return res.status(503).json({ success: false, message: 'Database is not connected.' })
  }
  try {
    const users = await storeUsers.find()
    const usersWithoutPasswords = users.map(formatUserResponse)
    res.json(usersWithoutPasswords)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving users.', error: error.message })
  }
})

// ─── GET /api/users/:id ──────────────────────────────────────────────────────
router.get('/:id', authenticateUser, async (req, res) => {
  if (!isDBConnected()) {
    return res.status(503).json({ success: false, message: 'Database is not connected.' })
  }
  try {
    const { id } = req.params

    // Users can only view their own profile; admins can view anyone's
    if (req.user.role !== 'admin' && req.user.customId !== id && req.user.id !== id) {
      return res.status(403).json({ success: false, message: 'Access denied.' })
    }

    const user = await storeUsers.findOne(id)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    res.json(formatUserResponse(user))
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving user.', error: error.message })
  }
})

// ─── PUT /api/users/:id (update profile) ─────────────────────────────────────
router.put('/:id', authenticateUser, async (req, res) => {
  if (!isDBConnected()) {
    return res.status(503).json({ success: false, message: 'Database is not connected.' })
  }
  try {
    const { id } = req.params

    // Users can only update their own profile; admins can update anyone's
    if (req.user.role !== 'admin' && req.user.customId !== id && req.user.id !== id) {
      return res.status(403).json({ success: false, message: 'Access denied.' })
    }

    // Fields a user is allowed to update
    const allowedFields = ['name', 'phone', 'address', 'avatar']
    // Admins can also update these
    const adminOnlyFields = ['role', 'accountStatus']

    const updateData = {}
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field]
    }
    if (req.user.role === 'admin') {
      for (const field of adminOnlyFields) {
        if (req.body[field] !== undefined) updateData[field] = req.body[field]
      }
    }

    const updated = await storeUsers.update(id, updateData)

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    res.json({ success: true, user: formatUserResponse(updated) })
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to update profile.', error: error.message })
  }
})

// ─── PUT /api/users/:id/status (admin only) ──────────────────────────────────
router.put('/:id/status', authenticateUser, requireAdmin, async (req, res) => {
  if (!isDBConnected()) {
    return res.status(503).json({ success: false, message: 'Database is not connected.' })
  }
  try {
    const { id } = req.params
    const { status } = req.body

    const updated = await storeUsers.updateStatus(id, status)

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    res.json(formatUserResponse(updated))
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to update user status.', error: error.message })
  }
})

// ─── DELETE /api/users/:id (admin only) ──────────────────────────────────────
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  if (!isDBConnected()) {
    return res.status(503).json({ success: false, message: 'Database is not connected.' })
  }
  try {
    const { id } = req.params

    const success = await storeUsers.delete(id)

    if (!success) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    res.json({ success: true, message: 'User deleted successfully.' })
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to delete user.', error: error.message })
  }
})

export default router
