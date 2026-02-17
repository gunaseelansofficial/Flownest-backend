const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

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

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
