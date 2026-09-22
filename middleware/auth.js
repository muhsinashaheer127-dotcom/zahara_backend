import jwt from 'jsonwebtoken'

/**
 * Verify JWT Bearer token from Authorization header.
 * Attaches decoded user object to req.user on success.
 */
export const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('[Auth] JWT_SECRET is not set in .env!')
      return res.status(500).json({ success: false, message: 'Server configuration error: JWT_SECRET missing.' })
    }

    const decoded = jwt.verify(token, secret)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' })
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token. Please log in again.' })
  }
}

/**
 * Require admin role — must be used AFTER authenticateUser.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' })
  }

  next()
}
