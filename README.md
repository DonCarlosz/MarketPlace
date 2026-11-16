# LocalMarket Application

A modern, peer-to-peer local marketplace built with the **MERN** stack for discovering and transacting **Second-Hand Goods**, **Brand-New Items**, and **Local Services** (handwork: barbers, photographers, nail techs, tutors, etc.).

## Core Architecture & Principles

- **Zero In-Platform Financial Transactions**: The platform strictly facilitates discovery, radius-based search, and real-time messaging. Physical handovers, appointments, and payments (cash or external payment apps) take place **off-platform** directly between users.
- **Three Core Modes**:
  1. 🔄 **Second-hand**: Pre-owned goods with condition grading.
  2. ✨ **New Items**: Brand-new, boxed or handmade items.
  3. 🛠️ **Local Services**: Skills, trades, and personal handwork (barbers, nail artists, tutors, photographers, cleaners).
- **Proximity Search**: MongoDB geospatial queries (`2dsphere`) supporting radius filters (5km, 15km, 25km, 50km, 100km).
- **Security & Account Safety**:
  - JWT Access & Refresh token rotation
  - Bcrypt password hashing
  - Progressive account lockout after 5 consecutive failed attempts
  - Rate limiting on authentication and listing publishing
  - Multer image upload filter & validation
  - In-app reporting queue for suspicious listings and bad actors

---

## Directory Structure

```text
MarketPlace Application/
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB connection
│   │   ├── controllers/     # Auth, Listings, Chat, Reports
│   │   ├── middleware/      # JWT auth, Rate limiters, Error handling
│   │   ├── models/          # User, Listing, Conversation, Message, Report schemas
│   │   ├── routes/          # API endpoints
│   │   ├── sockets/         # Socket.io real-time chat
│   │   ├── utils/           # JWT helpers & seed data script
│   │   └── server.js        # Express server entry point
│   ├── uploads/             # User image uploads
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, ModeSwitcher, ListingCard, SafetyBanner
│   │   ├── context/         # AuthContext & ModeContext (state management)
│   │   ├── pages/           # Home, ListingDetail, CreateListing, Chat, Login, Register, Profile
│   │   ├── services/        # Axios API client & Socket.io client
│   │   ├── App.jsx
│   │   ├── index.css        # Tailwind CSS
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
└── Plan/
    └── Local_Marketplace_Detailed_Plan.md
```

---

## Getting Started

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

*Default Port:* `http://localhost:5000`  
*Health Check:* `http://localhost:5000/api/health`

#### Optional: Seed Database with Sample Data
```bash
cd backend
npm run seed
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

*Default Vite Dev Server:* `http://localhost:5173`
