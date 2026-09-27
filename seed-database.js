import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;

async function seedDatabase() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const client = new Client({ connectionString });

  try {
    console.log('🔗 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Import seed data
    const { SEED_CATEGORIES } = await import('./data/categories.js');
    const { SEED_PRODUCTS } = await import('./data/products.js');
    const { SEED_USERS } = await import('./data/users.js');
    const { SEED_BOOKINGS } = await import('./data/bookings.js');
    const { SEED_ORDERS } = await import('./data/orders.js');
    const { SEED_PAYMENTS } = await import('./data/payments.js');
    const { SEED_REVIEWS } = await import('./data/reviews.js');
    const { SEED_SETTINGS } = await import('./data/settings.js');

    console.log('📋 Seeding database...');

    // Seed categories
    console.log('Seeding categories...');
    for (const category of SEED_CATEGORIES) {
      await client.query(
        `INSERT INTO categories (custom_id, name, slug, image, description) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (slug) DO NOTHING`,
        [category.customId, category.name, category.slug, category.image, category.description]
      );
    }
    console.log('✅ Categories seeded');

    // Seed users
    console.log('Seeding users...');
    for (const user of SEED_USERS) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      await client.query(
        `INSERT INTO users (custom_id, name, email, password, phone, address, role, account_status, avatar, member_since, registration_date, total_bookings) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
         ON CONFLICT (email) DO NOTHING`,
        [
          user.customId,
          user.name,
          user.email,
          hashedPassword,
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
    console.log('✅ Users seeded');

    // Seed products
    console.log('Seeding products...');
    for (const product of SEED_PRODUCTS) {
      await client.query(
        `INSERT INTO products (custom_id, name, slug, category, occasion, price, duration, deposit, market_value, rating, reviews, is_new_item, is_best_seller, is_featured, offer_badge, availability, available_quantity, estimated_delivery, sizes, images, description, specifications, customer_reviews) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) 
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
    console.log('✅ Products seeded');

    // Seed bookings
    console.log('Seeding bookings...');
    for (const booking of SEED_BOOKINGS) {
      // Try to find the actual product UUID from the products table
      let productId = null;
      if (booking.productId) {
        const productResult = await client.query(
          'SELECT id FROM products WHERE custom_id = $1 OR slug = $1 LIMIT 1',
          [booking.productId]
        );
        if (productResult.rows.length > 0) {
          productId = productResult.rows[0].id;
        }
      }

      await client.query(
        `INSERT INTO bookings (custom_id, customer_name, customer_email, customer_phone, product_id, product_name, product_image, start_date, end_date, rental_days, rental_amount, security_deposit, total_amount, delivery_address, status, payment_status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
         ON CONFLICT (custom_id) DO NOTHING`,
        [
          booking.customId,
          booking.customerName,
          booking.customerEmail,
          booking.customerPhone || '',
          productId,
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
    console.log('✅ Bookings seeded');

    // Seed orders
    console.log('Seeding orders...');
    for (const order of SEED_ORDERS) {
      // Try to find the actual booking UUID from the bookings table
      let bookingId = null;
      if (order.bookingId) {
        const bookingResult = await client.query(
          'SELECT id FROM bookings WHERE custom_id = $1 LIMIT 1',
          [order.bookingId]
        );
        if (bookingResult.rows.length > 0) {
          bookingId = bookingResult.rows[0].id;
        }
      }

      // Try to find the actual product UUID from the products table
      let productId = null;
      if (order.productId) {
        const productResult = await client.query(
          'SELECT id FROM products WHERE custom_id = $1 OR slug = $1 LIMIT 1',
          [order.productId]
        );
        if (productResult.rows.length > 0) {
          productId = productResult.rows[0].id;
        }
      }

      await client.query(
        `INSERT INTO orders (custom_id, booking_id, customer_name, customer_email, product_name, product_id, dispatch_date, delivery_date, return_date, status, is_overdue, tracking_code, delivery_address, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
         ON CONFLICT (custom_id) DO NOTHING`,
        [
          order.customId,
          bookingId,
          order.customerName,
          order.customerEmail,
          order.productName,
          productId,
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
    console.log('✅ Orders seeded');

    // Seed payments
    console.log('Seeding payments...');
    for (const payment of SEED_PAYMENTS) {
      // Try to find the actual booking UUID from the bookings table
      let bookingId = null;
      if (payment.bookingId) {
        const bookingResult = await client.query(
          'SELECT id FROM bookings WHERE custom_id = $1 LIMIT 1',
          [payment.bookingId]
        );
        if (bookingResult.rows.length > 0) {
          bookingId = bookingResult.rows[0].id;
        }
      }

      await client.query(
        `INSERT INTO payments (custom_id, booking_id, customer_name, customer_email, amount, rental_amount, deposit_amount, payment_date, payment_method, payment_status, transaction_id, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
         ON CONFLICT (custom_id) DO NOTHING`,
        [
          payment.customId,
          bookingId,
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
    console.log('✅ Payments seeded');

    // Seed reviews
    console.log('Seeding reviews...');
    for (const review of SEED_REVIEWS) {
      // Try to find the actual product UUID from the products table
      let productId = null;
      if (review.productId) {
        const productResult = await client.query(
          'SELECT id FROM products WHERE custom_id = $1 OR slug = $1 LIMIT 1',
          [review.productId]
        );
        if (productResult.rows.length > 0) {
          productId = productResult.rows[0].id;
        }
      }

      // Try to find the actual booking UUID from the bookings table
      let bookingId = null;
      if (review.bookingId) {
        const bookingResult = await client.query(
          'SELECT id FROM bookings WHERE custom_id = $1 LIMIT 1',
          [review.bookingId]
        );
        if (bookingResult.rows.length > 0) {
          bookingId = bookingResult.rows[0].id;
        }
      }

      await client.query(
        `INSERT INTO reviews (custom_id, customer_name, customer_email, product_id, product_name, booking_id, rating, date, comment, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         ON CONFLICT (custom_id) DO NOTHING`,
        [
          review.customId,
          review.customerName,
          review.customerEmail,
          productId,
          review.productName,
          bookingId,
          review.rating,
          review.date || new Date().toISOString().split('T')[0],
          review.comment,
          review.status || 'Pending'
        ]
      );
    }
    console.log('✅ Reviews seeded');

    // Seed settings
    console.log('Seeding settings...');
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
        SEED_SETTINGS.customId || 'settings_global',
        SEED_SETTINGS.siteName || 'Zahara Rental Jewellery',
        SEED_SETTINGS.adminEmail || 'zahararental@gmail.com',
        SEED_SETTINGS.contactPhone || '+91 7510484236',
        SEED_SETTINGS.currency || '₹',
        SEED_SETTINGS.minRentalDays || 3,
        SEED_SETTINGS.maxRentalDays || 14,
        SEED_SETTINGS.depositMultiplier || 1.0,
        SEED_SETTINGS.lateFeePerDay || 500,
        SEED_SETTINGS.deliveryCharge || 0,
        SEED_SETTINGS.freeDeliveryAbove || 1000,
        SEED_SETTINGS.notificationsEnabled !== undefined ? SEED_SETTINGS.notificationsEnabled : true,
        SEED_SETTINGS.emailAlerts !== undefined ? SEED_SETTINGS.emailAlerts : true,
        SEED_SETTINGS.smsAlerts !== undefined ? SEED_SETTINGS.smsAlerts : false,
        SEED_SETTINGS.maintenanceMode !== undefined ? SEED_SETTINGS.maintenanceMode : false,
        SEED_SETTINGS.paymentGatewayTestMode !== undefined ? SEED_SETTINGS.paymentGatewayTestMode : false,
        SEED_SETTINGS.allowedPaymentMethods || [],
        SEED_SETTINGS.instagramUrl || '',
        SEED_SETTINGS.whatsappNumber || '',
        SEED_SETTINGS.address || 'Kerala, India'
      ]
    );
    console.log('✅ Settings seeded');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`- Categories: ${SEED_CATEGORIES.length}`);
    console.log(`- Users: ${SEED_USERS.length}`);
    console.log(`- Products: ${SEED_PRODUCTS.length}`);
    console.log(`- Bookings: ${SEED_BOOKINGS.length}`);
    console.log(`- Orders: ${SEED_ORDERS.length}`);
    console.log(`- Payments: ${SEED_PAYMENTS.length}`);
    console.log(`- Reviews: ${SEED_REVIEWS.length}`);
    console.log('\n🔐 Login credentials:');
    console.log('Admin: admin@zahara.com / zahara@admin123');
    console.log('Demo:  demo@zahara.com / zahara123');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

seedDatabase().catch(console.error);
