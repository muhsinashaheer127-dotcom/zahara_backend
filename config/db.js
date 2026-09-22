import mongoose from 'mongoose'

let isConnected = false

export const connectDB = async () => {
  if (isConnected) {
    return true
  }

  const uri = process.env.MONGODB_URI

  if (!uri || uri.includes('<db_password>') || uri.includes('<password>') || uri.includes('<username>')) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      '[MongoDB] Warning: MONGODB_URI is not configured with real credentials in .env.'
    )
    console.warn(
      '\x1b[33m%s\x1b[0m',
      '[MongoDB] Please update .env with your actual MongoDB Atlas credentials.'
    )
    return false
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
    })
    isConnected = true
    console.log(`\x1b[32m[MongoDB] Connected successfully to: ${conn.connection.host}\x1b[0m`)
    console.log(`\x1b[32m[MongoDB] Database: ${conn.connection.name}\x1b[0m`)
    return true
  } catch (error) {
    console.error(`\x1b[31m[MongoDB] Connection failed: ${error.message}\x1b[0m`)
    console.error('\x1b[31m[MongoDB] Make sure:\x1b[0m')
    console.error('\x1b[31m  1. Your IP address is whitelisted in MongoDB Atlas (Network Access)\x1b[0m')
    console.error('\x1b[31m  2. Your credentials in .env are correct\x1b[0m')
    console.error('\x1b[31m  3. The cluster name in MONGODB_URI matches your Atlas cluster\x1b[0m')
    return false
  }
}

export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }
  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  }
}
