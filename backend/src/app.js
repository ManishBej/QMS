import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import router from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { getConfig, getRateLimitConfig, getCorsConfig } from './config/index.js';

const app = express();

// 🌐 Trust proxy for Vercel deployment
// This is required for rate limiting to work properly behind Vercel's proxy
app.set('trust proxy', 1);

// Get configuration
const rateLimitConfig = getRateLimitConfig();
const corsConfig = getCorsConfig();
const requestLimits = {
  json: getConfig('REQUEST.JSON_LIMIT', '10mb'),
  urlEncoded: getConfig('REQUEST.URL_ENCODED_LIMIT', '10mb')
};

// Request size limits for security
app.use(express.json({ limit: requestLimits.json }));
app.use(express.urlencoded({ extended: true, limit: requestLimits.urlEncoded }));

// Security middleware
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			imgSrc: ["'self'", "data:", "https:"],
			connectSrc: ["'self'"],
			fontSrc: ["'self'"],
			objectSrc: ["'none'"],
			mediaSrc: ["'self'"],
			frameSrc: ["'none'"],
		},
	},
	crossOriginEmbedderPolicy: false // Allow cross-origin requests for API
}));

// Rate limiting - general API protection
const limiter = rateLimit({
	windowMs: rateLimitConfig.WINDOW_MS,
	max: rateLimitConfig.MAX_REQUESTS,
	message: { error: 'too_many_requests', message: 'Too many requests from this IP' },
	standardHeaders: true,
	legacyHeaders: false,
	// Use default keyGenerator for proper IPv6 support
	handler: (req, res) => {
		res.status(429).json({ error: 'too_many_requests', message: 'Too many requests from this IP' });
	}
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
	windowMs: rateLimitConfig.WINDOW_MS,
	max: rateLimitConfig.AUTH_MAX_REQUESTS,
	message: { error: 'too_many_login_attempts', message: 'Too many login attempts from this IP' },
	skipSuccessfulRequests: rateLimitConfig.SKIP_SUCCESSFUL_REQUESTS,
	// Use default keyGenerator for proper IPv6 support
	handler: (req, res) => {
		res.status(429).json({ error: 'too_many_login_attempts', message: 'Too many login attempts from this IP' });
	}
});

// MongoDB injection protection
app.use(mongoSanitize());

// Cookie parser for secure session management
app.use(cookieParser());

// Apply general rate limiting to all API routes
app.use('/api/', limiter);

// Add explicit CORS headers for all requests
app.use((req, res, next) => {
	const origin = req.headers.origin;
	if (origin && (
		corsConfig.ALLOWED_ORIGINS.includes(origin) ||
		(process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin))
	)) {
		res.header('Access-Control-Allow-Origin', origin);
	}
	res.header('Access-Control-Allow-Credentials', 'true');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, x-csrf-token');
	res.header('Access-Control-Expose-Headers', 'X-CSRF-Token, x-csrf-token');
	next();
});

// Request logging middleware for debugging
if (process.env.NODE_ENV === 'development') {
	app.use((req, res, next) => {
		console.log(`📨 ${req.method} ${req.url} from ${req.headers.origin || 'no-origin'}`);
		next();
	});
}

// CORS configuration with better error handling
app.use(cors({
	origin: (origin, cb) => {
		// Allow requests with no origin (mobile apps, curl, etc.)
		if (!origin) return cb(null, true);
		
		// Check if origin is in allowed list
		if (corsConfig.ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
		
		// In development, allow localhost origins with any port
		if (process.env.NODE_ENV !== 'production') {
			const isLocalhost = origin?.includes('localhost') || 
			                   origin?.includes('127.0.0.1') ||
			                   origin?.includes('::1') ||
			                   /^http:\/\/localhost:\d+$/.test(origin);
			if (isLocalhost) {
				console.log(`✅ Allowing development origin: ${origin}`);
				return cb(null, true);
			}
		}
		
		console.warn(`❌ CORS blocked origin: ${origin}`);
		return cb(new Error(`CORS policy violation: Origin ${origin} not allowed`));
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-csrf-token'],
	exposedHeaders: ['X-CSRF-Token', 'x-csrf-token'],
	maxAge: corsConfig.MAX_AGE || 86400
}));

// Explicit preflight for all routes
app.options('*', (req, res) => {
	// Add CORS headers explicitly for OPTIONS requests
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, x-csrf-token');
	res.header('Access-Control-Expose-Headers', 'X-CSRF-Token, x-csrf-token');
	res.header('Access-Control-Max-Age', corsConfig.MAX_AGE || 86400);
	res.sendStatus(204);
});

// Apply auth rate limiting specifically to login endpoint
app.use('/api/login', authLimiter);

app.use('/api', router);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
