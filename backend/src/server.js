import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { noSqlSanitize } from './utils/sanitize.js';
import { setupChatSocket } from './sockets/chatSocket.js';

import authRoutes from './routes/authRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import userRoutes from './routes/userRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);

// Respect reverse proxy headers (Render / Vercel / Nginx) for accurate rate-limit IPs
app.set('trust proxy', 1);

// Connect MongoDB
connectDB();

// Strict CORS origin validator (prevents wildcard third-party credentialed requests)
const isProd = process.env.NODE_ENV === 'production';
const normalizeOrigin = (val) => String(val || '').trim().replace(/\/+$/, '').toLowerCase();

const extraAllowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)
);

const strictCorsActive =
  extraAllowedOrigins.size > 0 || String(process.env.CORS_STRICT_MODE || '').toLowerCase() === 'true';

if (isProd && !strictCorsActive) {
  console.warn(
    '[SECURITY] ALLOWED_ORIGINS is not set. Add ALLOWED_ORIGINS=https://<your-exact-frontend-domain> in Render to lock down CORS completely.'
  );
}

const isOriginAllowed = (origin) => {
  // Allow same-origin requests, server-to-server health checks, or native mobile clients without Origin
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (extraAllowedOrigins.has(normalized)) return true;

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    const isHttps = parsed.protocol === 'https:';

    // Always allow official oBuy production domains & self-origin Render API
    if (
      isHttps &&
      (host === 'obuy.ng' || host.endsWith('.obuy.ng') || host === 'marketplace-5wy3.onrender.com')
    ) {
      return true;
    }

    // Allow localhost & LAN IPs ONLY outside production
    if (
      !isProd &&
      (host === 'localhost' ||
        host === '127.0.0.1' ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host))
    ) {
      return true;
    }

    // Transitional HTTPS-only Vercel preview fallback ONLY when ALLOWED_ORIGINS is not yet set
    if (!strictCorsActive && isHttps && host.endsWith('.vercel.app')) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin not permitted by CORS policy'));
    }
  },
  credentials: true,
};

// Setup Socket.io with hardened CORS & JWT authentication
const io = new Server(server, {
  cors: {
    ...corsOptions,
    methods: ['GET', 'POST'],
  },
});

setupChatSocket(io);
app.set('io', io);

// Security & utility middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(noSqlSanitize);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Persistent MongoDB-backed media route (mounted before apiLimiter so galleries never hit API rate limits)
app.use('/api/media', mediaRoutes);

// Global API rate limit
app.use('/api', apiLimiter);

// Static uploads folder with cache headers for fast PWA loading
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    maxAge: '7d',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

// Serve official oBuy PNG icon for email clients & meta tags
app.get('/brand-icon.png', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=604800');
  res.sendFile(path.join(__dirname, '../public/brand-icon.png'));
});

// Root & Health Check Endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'oBuy Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'oBuy API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`oBuy Backend running on http://0.0.0.0:${PORT}`);
});
