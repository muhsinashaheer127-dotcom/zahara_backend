-- Zahara Jewellery Rental - Supabase PostgreSQL Schema
-- Migrated from MongoDB models

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  custom_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  address TEXT DEFAULT '',
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  account_status VARCHAR(20) DEFAULT 'Active' CHECK (account_status IN ('Active', 'Blocked', 'Pending')),
  avatar TEXT DEFAULT '',
  member_since VARCHAR(50) DEFAULT '',
  registration_date DATE DEFAULT CURRENT_DATE,
  total_bookings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  custom_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  image TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  custom_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(255) NOT NULL,
  occasion VARCHAR(255),
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER DEFAULT 3,
  deposit DECIMAL(10, 2) DEFAULT 0,
  market_value DECIMAL(10, 2) DEFAULT 0,
  rating DECIMAL(2, 1) DEFAULT 5 CHECK (rating >= 0 AND rating <= 5),
  reviews INTEGER DEFAULT 0,
  is_new_item BOOLEAN DEFAULT FALSE,
  is_best_seller BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  offer_badge VARCHAR(100) DEFAULT '',
  availability VARCHAR(50) DEFAULT 'available' CHECK (availability IN ('available', 'limited', 'out_of_stock', 'rented', 'maintenance', 'reserved', 'unavailable')),
  available_quantity INTEGER DEFAULT 1,
  estimated_delivery VARCHAR(100) DEFAULT '2-3 days',
  sizes TEXT[],
  images TEXT[],
  description TEXT DEFAULT '',
  specifications JSONB DEFAULT '{"material": "", "stones": "", "weight": "", "care": "", "finish": "", "insurance": "Included"}'::jsonb,
  customer_reviews JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  custom_id VARCHAR(255) UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) DEFAULT '',
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_image TEXT DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rental_days INTEGER DEFAULT 3,
  rental_amount DECIMAL(10, 2) NOT NULL,
  security_deposit DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  delivery_address JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'Confirmed' CHECK (status IN ('Pending', 'Confirmed', 'Active', 'Returned', 'Cancelled')),
  payment_status VARCHAR(50) DEFAULT 'Paid' CHECK (payment_status IN ('Pending', 'Paid', 'Refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  custom_id VARCHAR(255) UNIQUE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  dispatch_date DATE,
  delivery_date DATE NOT NULL,
  return_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'Packed' CHECK (status IN ('Packed', 'Ready for Dispatch', 'In Transit', 'Delivered', 'Return Initiated', 'Returned', 'Cancelled')),
  is_overdue BOOLEAN DEFAULT FALSE,
  tracking_code VARCHAR(255) DEFAULT '',
  delivery_address JSONB DEFAULT '{}'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  custom_id VARCHAR(255) UNIQUE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  rental_amount DECIMAL(10, 2) DEFAULT 0,
  deposit_amount DECIMAL(10, 2) DEFAULT 0,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(100) DEFAULT 'UPI / GPay' CHECK (payment_method IN ('UPI / GPay', 'UPI / PhonePe', 'UPI / Paytm', 'Credit Card', 'Debit Card', 'Net Banking', 'Bank Transfer', 'Cash', 'Other')),
  payment_status VARCHAR(50) DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Refunded', 'Failed', 'Partial')),
  transaction_id VARCHAR(255) DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  custom_id VARCHAR(255) UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  date DATE DEFAULT CURRENT_DATE,
  comment TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  custom_id VARCHAR(255) DEFAULT 'settings_global' UNIQUE,
  site_name VARCHAR(255) DEFAULT 'Zahara Rental Jewellery',
  admin_email VARCHAR(255) DEFAULT 'zahararental@gmail.com',
  contact_phone VARCHAR(50) DEFAULT '+91 7510484236',
  currency VARCHAR(10) DEFAULT '₹',
  min_rental_days INTEGER DEFAULT 3,
  max_rental_days INTEGER DEFAULT 14,
  deposit_multiplier DECIMAL(3, 2) DEFAULT 1.0,
  late_fee_per_day DECIMAL(10, 2) DEFAULT 500,
  delivery_charge DECIMAL(10, 2) DEFAULT 0,
  free_delivery_above DECIMAL(10, 2) DEFAULT 1000,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_alerts BOOLEAN DEFAULT TRUE,
  sms_alerts BOOLEAN DEFAULT FALSE,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  payment_gateway_test_mode BOOLEAN DEFAULT FALSE,
  allowed_payment_methods TEXT[],
  instagram_url TEXT DEFAULT '',
  whatsapp_number VARCHAR(50) DEFAULT '',
  address TEXT DEFAULT 'Kerala, India',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_availability ON products(availability);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_product_id ON bookings(product_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_orders_booking_id ON orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
