# Zahara Backend API

Express.js + MongoDB backend for the **Zahara Jewellery Rental** platform.

## Tech Stack
- **Runtime**: Node.js (ESM)
- **Framework**: Express.js v5
- **Database**: MongoDB Atlas via Mongoose
- **Auth**: JWT (jsonwebtoken) + bcryptjs

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create a `.env` file in this directory:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/zahara
JWT_SECRET=your_jwt_secret_here
PORT=5000
```

### 3. Seed the database (optional)
```bash
npm run seed
```

### 4. Start the server
```bash
# Production
npm start

# Development (with file watching)
npm run dev
```

Server runs on `http://localhost:5000`

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/health` | — | Health & DB status |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/register` | — | Register |
| GET | `/api/products` | — | List products |
| GET | `/api/products/:id` | — | Get product |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Delete product |
| GET | `/api/categories` | — | List categories |
| GET | `/api/bookings` | User | List bookings |
| POST | `/api/bookings` | User | Create booking |
| GET | `/api/orders` | User | List orders |
| GET | `/api/users` | Admin | List users |

## Diagnose DB Connection
```bash
npm run diagnose
```
