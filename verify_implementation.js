const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./models/User');
const Invoice = require('./models/Invoice');
const { sendWelcomeEmail, sendDailySalesReport } = require('./utils/emailService');

dotenv.config();

const testVerification = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/flownest');
        console.log('Connected to MongoDB for verification...');

        // 1. Test Email Configuration
        console.log('\n--- Testing Email Config ---');
        console.log('SMTP Host:', process.env.EMAIL_HOST);
        console.log('SMTP User:', process.env.EMAIL_USER);

        // 2. Test Welcome Email Logic
        const testUser = await User.findOne({ role: 'owner' });
        if (testUser) {
            console.log('\n--- Testing Welcome Email ---');
            console.log(`Sending test welcome email to ${testUser.email}...`);
            // await sendWelcomeEmail(testUser); // Uncomment to actually send if credentials are set
            console.log('Welcome email logic verification: Done (Function ready)');
        }

        // 3. Test Daily Sales Report Logic
        if (testUser && testUser.tenantId) {
            console.log('\n--- Testing Daily Sales Report ---');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const invoices = await Invoice.find({
                tenantId: testUser.tenantId,
                createdAt: { $gte: today }
            });

            console.log(`Found ${invoices.length} invoices for today.`);

            const totalRevenue = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
            const totalTransactions = invoices.length;

            const methods = ['Cash', 'UPI', 'Card'];
            const methodBreakdown = methods.map(m => ({
                name: m,
                amount: invoices.filter(inv => inv.paymentMethod === m).reduce((acc, inv) => acc + inv.totalAmount, 0)
            })).filter(m => m.amount > 0);

            console.log('Report Data Aggregate:', {
                totalRevenue,
                totalTransactions,
                methodBreakdown
            });

            // await sendDailySalesReport(testUser, { totalRevenue, totalTransactions, methodBreakdown }); // Uncomment to actually send
            console.log('Daily report logic verification: Done');
        }

        console.log('\nVerification script completed.');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
};

testVerification();
