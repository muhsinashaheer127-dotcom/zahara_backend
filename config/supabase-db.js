import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

let isConnected = false;
let isConnecting = false;
let reconnectTimer = null;
let pool = null;

/**
 * Create PostgreSQL connection pool
 */
function createPool() {
  return new pg.Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

/**
 * Connect to Supabase PostgreSQL
 */
export const connectDB = async () => {
  if (isConnected || isConnecting) {
    return isConnected;
  }

  const connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString || connectionString.includes('<password>')) {
    console.warn('\x1b[33m[Supabase] SUPABASE_DB_URL is not configured with real credentials in .env.\x1b[0m');
    console.warn('\x1b[33m[Supabase] Running in Local In-Memory Fallback Mode.\x1b[0m');
    return false;
  }

  isConnecting = true;

  try {
    pool = createPool();
    
    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    isConnected = true;
    isConnecting = false;
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    console.log(`\x1b[32m[Supabase] ✓ Connected successfully to PostgreSQL database\x1b[0m`);
    console.log(`\x1b[32m[Supabase] ✓ Server time: ${result.rows[0].now}\x1b[0m`);

    // Seed database if empty (temporarily disabled to fix seeding issues)
    // autoSeedIfEmpty();

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('\x1b[31m[Supabase] Unexpected pool error:', err.message);
      isConnected = false;
      scheduleReconnect();
    });

    return true;
  } catch (error) {
    isConnected = false;
    isConnecting = false;

    console.error(`\x1b[31m[Supabase] Connection FAILED: ${error.message}\x1b[0m`);
    console.warn('\x1b[33m[Supabase] Database unavailable — all DB-dependent API calls will return 503 errors.\x1b[0m');

    scheduleReconnect();
    return false;
  }
};

/**
 * Auto-seed tables if empty after successful connection
 */
async function autoSeedIfEmpty() {
  try {
    const client = await pool.connect();
    
    // Check if products table is empty
    const productResult = await client.query('SELECT COUNT(*) FROM products');
    const productCount = parseInt(productResult.rows[0].count);
    
    if (productCount === 0) {
      console.log('\x1b[36m[Supabase] Database is empty. Auto-seeding initial data...\x1b[0m');
      
      try {
        // Import seed data
        const { SEED_CATEGORIES } = await import('../data/categories.js');
        const { SEED_PRODUCTS } = await import('../data/products.js');
        const { SEED_USERS } = await import('../data/users.js');
        const { SEED_BOOKINGS } = await import('../data/bookings.js');
        const { SEED_ORDERS } = await import('../data/orders.js');
        const { SEED_PAYMENTS } = await import('../data/payments.js');
        const { SEED_REVIEWS } = await import('../data/reviews.js');
        const { SEED_SETTINGS } = await import('../data/settings.js');
        
        // Import bcrypt for hashing passwords
        const bcrypt = await import('bcryptjs');
        
        // Hash user passwords
        const seededUsers = await Promise.all(
          SEED_USERS.map(async (u) => ({
            ...u,
            password: await bcrypt.default.hash(u.password, 12),
          }))
        );
        
        // Insert seed data with error handling
        await seedCategories(client, SEED_CATEGORIES);
        await seedUsers(client, seededUsers);
        await seedProducts(client, SEED_PRODUCTS);
        await seedBookings(client, SEED_BOOKINGS);
        await seedOrders(client, SEED_ORDERS);
        await seedPayments(client, SEED_PAYMENTS);
        await seedReviews(client, SEED_REVIEWS);
        await seedSettings(client, SEED_SETTINGS);
        
        console.log('\x1b[32m[Supabase] Initial data seeded successfully!\x1b[0m');
        console.log('\x1b[32m[Supabase] Admin: admin@zahara.com / zahara@admin123\x1b[0m');
        console.log('\x1b[32m[Supabase] Demo:  demo@zahara.com / zahara123\x1b[0m');
      } catch (seedError) {
        console.warn('[Supabase] Seeding error:', seedError.message);
        console.warn('[Supabase] Some seed data may not have been inserted. Server will start anyway.');
      }
    }
    
    client.release();
  } catch (err) {
    console.warn('[Supabase] Auto-seed warning:', err.message);
  }
}

/**
 * Seed categories
 */
async function seedCategories(client, categories) {
  for (const category of categories) {
    await client.query(
      `INSERT INTO categories (custom_id, name, slug, image, description) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (slug) DO NOTHING`,
      [category.customId, category.name, category.slug, category.image, category.description]
    );
  }
}

/**
 * Seed users
 */
async function seedUsers(client, users) {
  for (const user of users) {
    await client.query(
      `INSERT INTO users (custom_id, name, email, password, phone, address, role, account_status, avatar, member_since, registration_date, total_bookings) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       ON CONFLICT (email) DO NOTHING`,
      [
        user.customId,
        user.name,
        user.email,
        user.password,
        user.phone || '',
        user.address || '',
        user.role || 'user',
        user.accountStatus || 'Active',
        user.avatar || '',
        user.memberSince || '',
        user.registrationDate || new Date().toISOString().split('T')[0],
        user.totalBookings || 0
      ]
    );
  }
}

/**
 * Seed products
 */
async function seedProducts(client, products) {
  for (const product of products) {
    await client.query(
      `INSERT INTO products (custom_id, name, slug, category, occasion, price, duration, deposit, market_value, rating, reviews, is_new_item, is_best_seller, is_featured, offer_badge, availability, available_quantity, estimated_delivery, sizes, images, description, specifications, customer_reviews) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) 
       ON CONFLICT (slug) DO NOTHING`,
      [
        product.customId,
        product.name,
        product.slug,
        product.category,
        product.occasion || '',
        product.price,
        product.duration || 3,
        product.deposit || 0,
        product.marketValue || 0,
        product.rating || 5,
        product.reviews || 0,
        product.isNewItem || false,
        product.isBestSeller || false,
        product.isFeatured || false,
        product.offerBadge || '',
        product.availability || 'available',
        product.availableQuantity || 1,
        product.estimatedDelivery || '2-3 days',
        product.sizes || [],
        product.images || [],
        product.description || '',
        JSON.stringify(product.specifications || {}),
        JSON.stringify(product.customerReviews || [])
      ]
    );
  }
}

/**
 * Seed bookings
 */
async function seedBookings(client, bookings) {
  for (const booking of bookings) {
    await client.query(
      `INSERT INTO bookings (custom_id, customer_name, customer_email, customer_phone, product_id, product_name, product_image, start_date, end_date, rental_days, rental_amount, security_deposit, total_amount, delivery_address, status, payment_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
       ON CONFLICT (custom_id) DO NOTHING`,
      [
        booking.customId,
        booking.customerName,
        booking.customerEmail,
        booking.customerPhone || '',
        booking.productId || null,
        booking.productName,
        booking.productImage || '',
        booking.startDate,
        booking.endDate,
        booking.rentalDays || 3,
        booking.rentalAmount,
        booking.securityDeposit || 0,
        booking.totalAmount,
        JSON.stringify(booking.deliveryAddress || {}),
        booking.status || 'Confirmed',
        booking.paymentStatus || 'Paid'
      ]
    );
  }
}

/**
 * Seed orders
 */
async function seedOrders(client, orders) {
  for (const order of orders) {
    await client.query(
      `INSERT INTO orders (custom_id, booking_id, customer_name, customer_email, product_name, product_id, dispatch_date, delivery_date, return_date, status, is_overdue, tracking_code, delivery_address, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
       ON CONFLICT (custom_id) DO NOTHING`,
      [
        order.customId,
        order.bookingId || null,
        order.customerName,
        order.customerEmail,
        order.productName,
        order.productId || null,
        order.dispatchDate || null,
        order.deliveryDate,
        order.returnDate,
        order.status || 'Packed',
        order.isOverdue || false,
        order.trackingCode || '',
        JSON.stringify(order.deliveryAddress || {}),
        order.notes || ''
      ]
    );
  }
}

/**
 * Seed payments
 */
async function seedPayments(client, payments) {
  for (const payment of payments) {
    await client.query(
      `INSERT INTO payments (custom_id, booking_id, customer_name, customer_email, amount, rental_amount, deposit_amount, payment_date, payment_method, payment_status, transaction_id, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       ON CONFLICT (custom_id) DO NOTHING`,
      [
        payment.customId,
        payment.bookingId || null,
        payment.customerName,
        payment.customerEmail,
        payment.amount,
        payment.rentalAmount || 0,
        payment.depositAmount || 0,
        payment.paymentDate,
        payment.paymentMethod || 'UPI / GPay',
        payment.paymentStatus || 'Pending',
        payment.transactionId || '',
        payment.notes || ''
      ]
    );
  }
}

/**
 * Seed reviews
 */
async function seedReviews(client, reviews) {
  for (const review of reviews) {
    await client.query(
      `INSERT INTO reviews (custom_id, customer_name, customer_email, product_id, product_name, booking_id, rating, date, comment, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       ON CONFLICT (custom_id) DO NOTHING`,
      [
        review.customId,
        review.customerName,
        review.customerEmail,
        review.productId || null,
        review.productName,
        review.bookingId || null,
        review.rating,
        review.date || new Date().toISOString().split('T')[0],
        review.comment,
        review.status || 'Pending'
      ]
    );
  }
}

/**
 * Seed settings
 */
async function seedSettings(client, settings) {
  await client.query(
    `INSERT INTO settings (custom_id, site_name, admin_email, contact_phone, currency, min_rental_days, max_rental_days, deposit_multiplier, late_fee_per_day, delivery_charge, free_delivery_above, notifications_enabled, email_alerts, sms_alerts, maintenance_mode, payment_gateway_test_mode, allowed_payment_methods, instagram_url, whatsapp_number, address) 
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
       address = EXCLUDED.address`,
    [
      settings.customId || 'settings_global',
      settings.siteName || 'Zahara Rental Jewellery',
      settings.adminEmail || 'zahararental@gmail.com',
      settings.contactPhone || '+91 7510484236',
      settings.currency || '₹',
      settings.minRentalDays || 3,
      settings.maxRentalDays || 14,
      settings.depositMultiplier || 1.0,
      settings.lateFeePerDay || 500,
      settings.deliveryCharge || 0,
      settings.freeDeliveryAbove || 1000,
      settings.notificationsEnabled !== undefined ? settings.notificationsEnabled : true,
      settings.emailAlerts !== undefined ? settings.emailAlerts : true,
      settings.smsAlerts !== undefined ? settings.smsAlerts : false,
      settings.maintenanceMode !== undefined ? settings.maintenanceMode : false,
      settings.paymentGatewayTestMode !== undefined ? settings.paymentGatewayTestMode : false,
      settings.allowedPaymentMethods ? JSON.stringify(settings.allowedPaymentMethods) : '[]',
      settings.instagramUrl || '',
      settings.whatsappNumber || '',
      settings.address || 'Kerala, India'
    ]
  );
}

function scheduleReconnect() {
  if (!reconnectTimer) {
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      console.log('[Supabase] Attempting background reconnection...');
      connectDB();
    }, 20000);
  }
}

export const isDBConnected = () => isConnected && pool !== null;

export const getDBStatus = () => {
  return {
    state: isConnected ? 'connected' : 'disconnected',
    isConnected: isConnected,
    pool: pool ? 'active' : 'inactive',
    fallbackMode: !isConnected,
  };
};

/**
 * Get database client for queries
 */
export const getDBClient = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDB() first.');
  }
  return pool;
};

/**
 * Execute a query with error handling
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

/**
 * Close database connection
 */
export const closeDB = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
    console.log('[Supabase] Database connection closed');
  }
};
