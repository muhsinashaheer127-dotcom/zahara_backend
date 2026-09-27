/**
 * supabase-store.js
 * All database operations go directly to Supabase PostgreSQL.
 * No in-memory fallback — if the database is unavailable, operations throw errors.
 * The frontend receives a clear error message instead of fake local data.
 */
import { isDBConnected, query, getDBClient } from '../config/supabase-db.js'

/** Throw a clear error when DB is not connected */
const requireDB = () => {
  if (!isDBConnected()) {
    throw new Error('Database is not connected. Please ensure Supabase PostgreSQL is reachable.')
  }
}

/** Helper to convert PostgreSQL rows to match MongoDB-like format */
const formatResponse = (row) => {
  if (!row) return null
  const formatted = { ...row }
  formatted.id = formatted.custom_id || formatted.id
  delete formatted.custom_id
  return formatted
}

const formatArrayResponse = (rows) => {
  return rows.map(formatResponse)
}

/* =========================================================================
   PRODUCTS
   ========================================================================= */
export const storeProducts = {
  find: async (filter = {}) => {
    requireDB()
    let queryText = 'SELECT * FROM products'
    const params = []
    const conditions = []

    if (filter.category) {
      conditions.push('category = $' + (params.length + 1))
      params.push(filter.category)
    }
    if (filter.occasion) {
      conditions.push('occasion = $' + (params.length + 1))
      params.push(filter.occasion)
    }
    if (filter.search) {
      conditions.push('(name ILIKE $' + (params.length + 1) + ' OR description ILIKE $' + (params.length + 1) + ')')
      params.push(`%${filter.search}%`)
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ')
    }
    queryText += ' ORDER BY created_at DESC'

    const result = await query(queryText, params)
    return formatArrayResponse(result.rows)
  },

  findOne: async (idOrSlug) => {
    requireDB()
    const clean = String(idOrSlug || '').trim()
    const queryText = 'SELECT * FROM products WHERE slug = $1 OR custom_id = $2'
    const result = await query(queryText, [clean.toLowerCase(), clean])
    return formatResponse(result.rows[0])
  },

  create: async (data) => {
    requireDB()
    const queryText = `
      INSERT INTO products (custom_id, name, slug, category, occasion, price, duration, deposit, market_value, rating, reviews, is_new_item, is_best_seller, is_featured, offer_badge, availability, available_quantity, estimated_delivery, sizes, images, description, specifications, customer_reviews)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `
    const params = [
      data.customId || data.slug,
      data.name,
      data.slug,
      data.category,
      data.occasion || '',
      data.price,
      data.duration || 3,
      data.deposit || 0,
      data.marketValue || 0,
      data.rating || 5,
      data.reviews || 0,
      data.isNewItem || false,
      data.isBestSeller || false,
      data.isFeatured || false,
      data.offerBadge || '',
      data.availability || 'available',
      data.availableQuantity || 1,
      data.estimatedDelivery || '2-3 days',
      data.sizes || [],
      data.images || [],
      data.description || '',
      JSON.stringify(data.specifications || {}),
      JSON.stringify(data.customerReviews || [])
    ]
    const result = await query(queryText, params)
    return formatResponse(result.rows[0])
  },

  update: async (id, data) => {
    requireDB()
    const cleanId = String(id || '').trim()
    
    // Build dynamic update query
    const updates = []
    const params = []
    let paramIndex = 1

    const fieldMap = {
      name: 'name',
      slug: 'slug',
      category: 'category',
      occasion: 'occasion',
      price: 'price',
      duration: 'duration',
      deposit: 'deposit',
      marketValue: 'market_value',
      rating: 'rating',
      reviews: 'reviews',
      isNewItem: 'is_new_item',
      isBestSeller: 'is_best_seller',
      isFeatured: 'is_featured',
      offerBadge: 'offer_badge',
      availability: 'availability',
      availableQuantity: 'available_quantity',
      estimatedDelivery: 'estimated_delivery',
      sizes: 'sizes',
      images: 'images',
      description: 'description',
      specifications: 'specifications',
      customerReviews: 'customer_reviews'
    }

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        if (key === 'specifications' || key === 'customerReviews') {
          updates.push(`${dbField} = $${paramIndex}`)
          params.push(JSON.stringify(data[key]))
        } else if (key === 'sizes' || key === 'images') {
          updates.push(`${dbField} = $${paramIndex}`)
          params.push(data[key])
        } else {
          updates.push(`${dbField} = $${paramIndex}`)
          params.push(data[key])
        }
        paramIndex++
      }
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(cleanId.toLowerCase(), cleanId)

    const queryText = `
      UPDATE products 
      SET ${updates.join(', ')}
      WHERE slug = $${paramIndex} OR custom_id = $${paramIndex + 1}
      RETURNING *
    `

    const result = await query(queryText, params)
    return formatResponse(result.rows[0])
  },

  delete: async (id) => {
    requireDB()
    const cleanId = String(id || '').trim()
    const queryText = 'DELETE FROM products WHERE slug = $1 OR custom_id = $2 RETURNING id'
    const result = await query(queryText, [cleanId.toLowerCase(), cleanId])
    return result.rows.length > 0
  },
}

/* =========================================================================
   CATEGORIES
   ========================================================================= */
export const storeCategories = {
  find: async () => {
    requireDB()
    const queryText = 'SELECT * FROM categories ORDER BY created_at ASC'
    const result = await query(queryText)
    return formatArrayResponse(result.rows)
  },

  create: async (data) => {
    requireDB()
    const queryText = `
      INSERT INTO categories (custom_id, name, slug, image, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    const params = [
      data.customId || data.slug,
      data.name,
      data.slug,
      data.image || '',
      data.description || ''
    ]
    const result = await query(queryText, params)
    return formatResponse(result.rows[0])
  },

  update: async (id, data) => {
    requireDB()
    const cleanId = String(id || '').trim()
    
    const updates = []
    const params = []
    let paramIndex = 1

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`)
      params.push(data.name)
      paramIndex++
    }
    if (data.slug !== undefined) {
      updates.push(`slug = $${paramIndex}`)
      params.push(data.slug)
      paramIndex++
    }
    if (data.image !== undefined) {
      updates.push(`image = $${paramIndex}`)
      params.push(data.image)
      paramIndex++
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`)
      params.push(data.description)
      paramIndex++
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(cleanId, cleanId.toLowerCase())

    const queryText = `
      UPDATE categories 
      SET ${updates.join(', ')}
      WHERE custom_id = $${paramIndex} OR slug = $${paramIndex + 1}
      RETURNING *
    `

    const result = await query(queryText, params)
    return formatResponse(result.rows[0])
  },

  delete: async (id) => {
    requireDB()
    const cleanId = String(id || '').trim()
    const queryText = 'DELETE FROM categories WHERE custom_id = $1 OR slug = $2 RETURNING id'
    const result = await query(queryText, [cleanId, cleanId.toLowerCase()])
    return result.rows.length > 0
  },
}

/* =========================================================================
   BOOKINGS
   ========================================================================= */
export const storeBookings = {
  find: async (filter = {}) => {
    requireDB()
    let queryText = 'SELECT * FROM bookings'
    const params = []
    const conditions = []

    if (filter.userId) {
      conditions.push('(customer_email = $1 OR product_id = $1)')
      params.push(filter.userId)
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ')
    }
    queryText += ' ORDER BY created_at DESC'

    const result = await query(queryText, params)
    return formatArrayResponse(result.rows)
  },

  findOne: async (id) => {
    requireDB()
    const clean = String(id || '').trim()
    const queryText = 'SELECT * FROM bookings WHERE custom_id = $1'
    const result = await query(queryText, [clean])
    return formatResponse(result.rows[0])
  },

  create: async (data) => {
    requireDB()
    const queryText = `
      INSERT INTO bookings (custom_id, customer_name, customer_email, customer_phone, product_id, product_name, product_image, start_date, end_date, rental_days, rental_amount, security_deposit, total_amount, delivery_address, status, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `
    const params = [
      data.customId,
      data.customerName,
      data.customerEmail,
      data.customerPhone || '',
      data.productId || null,
      data.productName,
      data.productImage || '',
      data.startDate,
      data.endDate,
      data.rentalDays || 3,
      data.rentalAmount,
      data.securityDeposit || 0,
      data.totalAmount,
      JSON.stringify(data.deliveryAddress || {}),
      data.status || 'Confirmed',
      data.paymentStatus || 'Paid'
    ]
    const result = await query(queryText, params)
    return formatResponse(result.rows[0])
  },

  updateStatus: async (id, status, paymentStatus) => {
    requireDB()
    const updates = []
    const params = []
    let paramIndex = 1

    if (status) {
      updates.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }
    if (paymentStatus) {
      updates.push(`payment_status = $${paramIndex}`)
      params.push(paymentStatus)
      paramIndex++
    }

    if (updates.length === 0) {
      throw new Error('No status to update')
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(id)

    const queryText = `
      UPDATE bookings 
      SET ${updates.join(', ')}
      WHERE custom_id = $${paramIndex}
      RETURNING *
    `

    const result = await query(queryText, params)
    return formatResponse(result.rows[0])
  },
}

/* =========================================================================
   ORDERS
   ========================================================================= */
export const storeOrders = {
  find: async () => {
    requireDB()
    const queryText = 'SELECT * FROM orders ORDER BY created_at DESC'
    const result = await query(queryText)
    return formatArrayResponse(result.rows)
  },

  updateStatus: async (id, status) => {
    requireDB()
    const queryText = `
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE custom_id = $2
      RETURNING *
    `
    const result = await query(queryText, [status, id])
    return formatResponse(result.rows[0])
  },
}

/* =========================================================================
   PAYMENTS
   ========================================================================= */
export const storePayments = {
  find: async () => {
    requireDB()
    const queryText = 'SELECT * FROM payments ORDER BY created_at DESC'
    const result = await query(queryText)
    return formatArrayResponse(result.rows)
  },

  updateStatus: async (id, paymentStatus) => {
    requireDB()
    const queryText = `
      UPDATE payments 
      SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE custom_id = $2
      RETURNING *
    `
    const result = await query(queryText, [paymentStatus, id])
    return formatResponse(result.rows[0])
  },
}

/* =========================================================================
   REVIEWS
   ========================================================================= */
export const storeReviews = {
  find: async () => {
    requireDB()
    const queryText = 'SELECT * FROM reviews ORDER BY created_at DESC'
    const result = await query(queryText)
    return formatArrayResponse(result.rows)
  },

  findOne: async (id) => {
    requireDB()
    const clean = String(id || '').trim()
    const queryText = 'SELECT * FROM reviews WHERE custom_id = $1'
    const result = await query(queryText, [clean])
    return formatResponse(result.rows[0])
  },

  create: async (data) => {
    requireDB()
    const queryText = `
      INSERT INTO reviews (custom_id, customer_name, customer_email, product_id, product_name, booking_id, rating, date, comment, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `
    const params = [
      data.customId,
      data.customerName,
      data.customerEmail,
      data.productId || null,
      data.productName,
      data.bookingId || null,
      data.rating,
      data.date || new Date().toISOString().split('T')[0],
      data.comment,
      data.status || 'Pending'
    ]
    const result = await query(queryText, params)
    return formatResponse(result.rows[0])
  },

  updateStatus: async (id, status) => {
    requireDB()
    const queryText = `
      UPDATE reviews
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE custom_id = $2
      RETURNING *
    `
    const result = await query(queryText, [status, id])
    return formatResponse(result.rows[0])
  },

  delete: async (id) => {
    requireDB()
    const queryText = 'DELETE FROM reviews WHERE custom_id = $1 RETURNING id'
    const result = await query(queryText, [id])
    return result.rows.length > 0
  },
}

/* =========================================================================
   SETTINGS
   ========================================================================= */
export const storeSettings = {
  get: async () => {
    requireDB()
    const queryText = 'SELECT * FROM settings WHERE custom_id = $1 LIMIT 1'
    const result = await query(queryText, ['settings_global'])
    if (result.rows.length === 0) {
      // Fallback to any settings if default not found
      const fallbackQuery = 'SELECT * FROM settings LIMIT 1'
      const fallbackResult = await query(fallbackQuery)
      return formatResponse(fallbackResult.rows[0])
    }
    return formatResponse(result.rows[0])
  },

  save: async (data) => {
    requireDB()
    const queryText = `
      INSERT INTO settings (custom_id, site_name, admin_email, contact_phone, currency, min_rental_days, max_rental_days, deposit_multiplier, late_fee_per_day, delivery_charge, free_delivery_above, notifications_enabled, email_alerts, sms_alerts, maintenance_mode, payment_gateway_test_mode, allowed_payment_methods, instagram_url, whatsapp_number, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (custom_id) DO UPDATE SET
        site_name = EXCLUDED.site_name,
        admin_email = EXCLUDED.admin_email,
        contact_phone = EXCLUDED.contact_phone,
        currency = EXCLUDED.currency,
        min_rental_days = EXCLUDED.min_rental_days,
        max_rental_days = EXCLUDED.max_rental_days,
        deposit_multiplier = EXCLUDED.deposit_multiplier,
        late_fee_per_day = EXCLUDED.late_fee_per_day,
        delivery_charge = EXCLUDED.delivery_charge,
        free_delivery_above = EXCLUDED.free_delivery_above,
        notifications_enabled = EXCLUDED.notifications_enabled,
        email_alerts = EXCLUDED.email_alerts,
        sms_alerts = EXCLUDED.sms_alerts,
        maintenance_mode = EXCLUDED.maintenance_mode,
        payment_gateway_test_mode = EXCLUDED.payment_gateway_test_mode,
        allowed_payment_methods = EXCLUDED.allowed_payment_methods,
        instagram_url = EXCLUDED.instagram_url,
        whatsapp_number = EXCLUDED.whatsapp_number,
        address = EXCLUDED.address,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `
    const params = [
      data.customId || 'settings_global',
      data.siteName || 'Zahara Rental Jewellery',
      data.adminEmail || 'zahararental@gmail.com',
      data.contactPhone || '+91 7510484236',
      data.currency || '₹',
      data.minRentalDays || 3,
      data.maxRentalDays || 14,
      data.depositMultiplier || 1.0,
      data.lateFeePerDay || 500,
      data.deliveryCharge || 0,
      data.freeDeliveryAbove || 1000,
      data.notificationsEnabled !== undefined ? data.notificationsEnabled : true,
      data.emailAlerts !== undefined ? data.emailAlerts : true,
      data.smsAlerts !== undefined ? data.smsAlerts : false,
      data.maintenanceMode !== undefined ? data.maintenanceMode : false,
      data.paymentGatewayTestMode !== undefined ? data.paymentGatewayTestMode : false,
      data.allowedPaymentMethods || [],
      data.instagramUrl || '',
      data.whatsappNumber || '',
      data.address || 'Kerala, India'
    ]
    const result = await query(queryText, params)
    return formatResponse(result.rows[0])
  },
}

/* =========================================================================
   USERS
   ========================================================================= */
export const storeUsers = {
  find: async () => {
    requireDB()
    const queryText = 'SELECT * FROM users ORDER BY created_at DESC'
    const result = await query(queryText)
    return formatArrayResponse(result.rows)
  },

  findOne: async (identifier) => {
    requireDB()
    const clean = String(identifier || '').trim()
    const queryText = 'SELECT * FROM users WHERE email = $1 OR custom_id = $2'
    const result = await query(queryText, [clean.toLowerCase(), clean])
    return formatResponse(result.rows[0])
  },

  findOneWithEmail: async (email) => {
    requireDB()
    const queryText = 'SELECT * FROM users WHERE email = $1'
    const result = await query(queryText, [email.toLowerCase()])
    return formatResponse(result.rows[0])
  },

  create: async (data) => {
    requireDB()
    const queryText = `
      INSERT INTO users (custom_id, name, email, password, phone, address, role, account_status, avatar, member_since, registration_date, total_bookings)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `
    const params = [
      data.customId || `usr_${Date.now()}`,
      data.name,
      data.email.toLowerCase(),
      data.password,
      data.phone || '',
      data.address || '',
      data.role || 'user',
      data.accountStatus || 'Active',
      data.avatar || '',
      data.memberSince || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      data.registrationDate || new Date().toISOString().split('T')[0],
      data.totalBookings || 0
    ]
    const result = await query(queryText, params)
    return formatResponse(result.rows[0])
  },

  update: async (id, data) => {
    requireDB()
    const cleanId = String(id || '').trim()
    
    const updates = []
    const params = []
    let paramIndex = 1

    const fieldMap = {
      name: 'name',
      phone: 'phone',
      address: 'address',
      avatar: 'avatar',
      role: 'role',
      accountStatus: 'account_status',
      totalBookings: 'total_bookings'
    }

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        updates.push(`${dbField} = $${paramIndex}`)
        params.push(data[key])
        paramIndex++
      }
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(cleanId, cleanId.toLowerCase())

    const queryText = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE custom_id = $${paramIndex} OR email = $${paramIndex + 1}
      RETURNING *
    `

    const result = await query(queryText, params)
    return formatResponse(result.rows[0])
  },

  updateStatus: async (id, status) => {
    requireDB()
    const cleanId = String(id || '').trim()
    const queryText = `
      UPDATE users 
      SET account_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE custom_id = $2 OR email = $3
      RETURNING *
    `
    const result = await query(queryText, [status, cleanId, cleanId.toLowerCase()])
    return formatResponse(result.rows[0])
  },

  delete: async (id) => {
    requireDB()
    const cleanId = String(id || '').trim()
    const queryText = 'DELETE FROM users WHERE custom_id = $1 OR email = $2 RETURNING id'
    const result = await query(queryText, [cleanId, cleanId.toLowerCase()])
    return result.rows.length > 0
  },
}
