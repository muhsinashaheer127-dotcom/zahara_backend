import { connectDB, getDBStatus } from './config/supabase-db.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

async function testConnection() {
  console.log('🔗 Testing Supabase PostgreSQL connection...\n')
  
  const connected = await connectDB()
  
  if (connected) {
    console.log('\n✅ Connection successful!')
    const status = getDBStatus()
    console.log('📊 Database Status:', JSON.stringify(status, null, 2))
  } else {
    console.log('\n❌ Connection failed!')
    console.log('Please check your .env file and ensure:')
    console.log('1. SUPABASE_DB_URL is set correctly')
    console.log('2. Database password is correct')
    console.log('3. Supabase project is active')
  }
  
  process.exit(connected ? 0 : 1)
}

testConnection().catch(console.error)
