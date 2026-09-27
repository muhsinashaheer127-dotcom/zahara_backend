import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function setupSupabase() {
  const connectionString = 'postgresql://postgres:MUHSINA@2005@db.pfafkiztoqkrvsagvacz.supabase.co:5432/postgres';
  
  const client = new Client({
    connectionString,
  });

  try {
    console.log('🔗 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read the SQL schema file
    const schemaPath = './supabase-schema.sql';
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Creating database schema...');
    await client.query(schema);
    console.log('✅ Database schema created successfully!');

    console.log('\n🎉 Supabase database setup completed!');
    console.log('📊 Tables created: users, categories, products, bookings, orders, payments, reviews, settings');
    
  } catch (error) {
    console.error('❌ Error setting up Supabase:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

setupSupabase().catch(console.error);
