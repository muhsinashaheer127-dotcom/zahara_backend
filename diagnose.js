import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import dns from 'dns'
import net from 'net'
import tls from 'tls'
import mongoose from 'mongoose'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN   = '\x1b[36m'
const BOLD   = '\x1b[1m'
const RESET  = '\x1b[0m'

async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    return data.ip
  } catch {
    try {
      const res2 = await fetch('https://ifconfig.me/ip', { signal: AbortSignal.timeout(5000) })
      return (await res2.text()).trim()
    } catch {
      return 'Unknown (Could not fetch public IP)'
    }
  }
}

async function diagnose() {
  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}`)
  console.log(`${BOLD}║          Zahara MongoDB Atlas Connection Diagnostics         ║${RESET}`)
  console.log(`${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`)

  // 1. Fetch Public IP
  process.stdout.write(`[1/5] Detecting Public IP Address... `)
  const publicIP = await getPublicIP()
  console.log(`${GREEN}${BOLD}${publicIP}${RESET}`)

  // 2. Check .env and URI
  process.stdout.write(`[2/5] Checking MONGODB_URI in .env... `)
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.log(`${RED}FAILED${RESET}`)
    console.error(`\n${RED}Error: MONGODB_URI is not defined in .env${RESET}`)
    process.exit(1)
  }
  if (uri.includes('<db_password>') || uri.includes('<password>')) {
    console.log(`${RED}FAILED${RESET}`)
    console.error(`\n${RED}Error: MONGODB_URI contains placeholder password. Please replace with actual password.${RESET}`)
    process.exit(1)
  }
  console.log(`${GREEN}OK${RESET}`)

  // Extract cluster hostname
  const clusterMatch = uri.match(/@([^/?#]+)/)
  const clusterHost = clusterMatch ? clusterMatch[1] : null
  if (!clusterHost) {
    console.error(`${RED}Could not parse cluster host from URI: ${uri}${RESET}`)
    process.exit(1)
  }

  // 3. DNS SRV Lookup
  process.stdout.write(`[3/5] Resolving DNS SRV for ${CYAN}${clusterHost}${RESET}... `)
  let shardHosts = []
  try {
    const srvRecords = await dns.promises.resolveSrv(`_mongodb._tcp.${clusterHost}`)
    shardHosts = srvRecords.map((r) => ({ host: r.name, port: r.port }))
    console.log(`${GREEN}OK (${shardHosts.length} shards found)${RESET}`)
    shardHosts.forEach((s) => console.log(`      └─ ${s.host}:${s.port}`))
  } catch (err) {
    console.log(`${RED}FAILED (${err.message})${RESET}`)
    console.error(`\n${RED}DNS SRV resolution failed. Make sure your cluster hostname is valid.${RESET}`)
    process.exit(1)
  }

  // 4. TCP & TLS Handshake to Shards
  const targetShard = shardHosts[0]
  process.stdout.write(`[4/5] Testing TLS Handshake with ${CYAN}${targetShard.host}:${targetShard.port}${RESET}... `)

  const tlsResult = await new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: targetShard.host,
        port: targetShard.port,
        servername: targetShard.host,
        timeout: 6000,
      },
      () => {
        socket.end()
        resolve({ success: true })
      }
    )
    socket.on('error', (err) => resolve({ success: false, error: err }))
    socket.on('timeout', () => {
      socket.destroy()
      resolve({ success: false, error: new Error('TLS connection timed out after 6000ms') })
    })
  })

  if (!tlsResult.success) {
    console.log(`${RED}FAILED${RESET}`)
    const err = tlsResult.error
    console.log(`\n${RED}TLS Error Details:${RESET} ${err.message}`)

    if (err.message.includes('alert number 80') || err.message.includes('alert internal error')) {
      console.log(`\n${YELLOW}${BOLD}⚠ DIAGNOSIS: YOUR IP IS NOT WHITELISTED IN MONGODB ATLAS${RESET}`)
      console.log(`MongoDB Atlas returns ${BOLD}SSL Alert 80 (Internal Error)${RESET} when your IP is blocked by Atlas Network Access.`)
      console.log(`\n${CYAN}${BOLD}HOW TO FIX IN 30 SECONDS:${RESET}`)
      console.log(` 1. Open ${BOLD}https://cloud.mongodb.com/${RESET}`)
      console.log(` 2. In the left sidebar, click ${BOLD}Network Access${RESET} (under Security)`)
      console.log(` 3. Click ${BOLD}Add IP Address${RESET}`)
      console.log(` 4. Either:`)
      console.log(`    - Click ${BOLD}"Allow Access From Anywhere"${RESET} (adds ${GREEN}0.0.0.0/0${RESET} — recommended for dev)`)
      console.log(`    - Or click ${BOLD}"Add Current IP Address"${RESET} (adds ${GREEN}${publicIP}/32${RESET})`)
      console.log(` 5. Click ${BOLD}Confirm${RESET} and wait ~30 seconds for it to become Active.`)
      console.log(` 6. Re-run ${BOLD}npm run db:test${RESET}\n`)
    }
    process.exit(1)
  }
  console.log(`${GREEN}OK (TLS handshake completed)${RESET}`)

  // 5. Full Mongoose Connection & Ping Test
  process.stdout.write(`[5/5] Connecting with Mongoose & pinging MongoDB Atlas... `)
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 7000,
      connectTimeoutMS: 7000,
    })
    console.log(`${GREEN}SUCCESS!${RESET}`)
    console.log(`\n${GREEN}${BOLD}✓ Connected to Database:${RESET} ${conn.connection.name}`)
    console.log(`${GREEN}${BOLD}✓ Host:${RESET} ${conn.connection.host}`)

    const adminDb = conn.connection.db.admin()
    const pingResult = await adminDb.ping()
    console.log(`${GREEN}${BOLD}✓ Ping OK:${RESET}`, pingResult)

    await mongoose.connection.close()
    console.log(`\n${GREEN}${BOLD}Everything is set up correctly for MongoDB Atlas!${RESET}\n`)
    process.exit(0)
  } catch (err) {
    console.log(`${RED}FAILED${RESET}`)
    console.error(`\n${RED}Mongoose Error: ${err.message}${RESET}`)
    process.exit(1)
  }
}

diagnose()
