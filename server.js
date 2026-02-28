const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { initCronTasks } = require('./utils/cronTasks');

dotenv.config();
connectDB();
initCronTasks();

const app = express();

// 1. MUST BE FIRST: Configure CORS with specific origins (NO WILDCARDS)
const allowedOrigins = [
    'https://www.flownest.in',
    'https://flownest.in',
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error(`CORS Error: Origin ${origin} not allowed`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-XSRF-TOKEN'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200
}));

// 2. Cookie Parser (Required for credentials/cookies)
app.use(cookieParser());

// Security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// XSS and Sanitization logic follows...

// Disable X-Powered-By header
app.disable('x-powered-by');

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tenants', require('./routes/tenantRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/credits', require('./routes/creditRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
