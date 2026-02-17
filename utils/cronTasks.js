const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendDailySalesReport } = require('./emailService');

const initCronTasks = () => {
    // Schedule task to run at 23:59 (11:59 PM) every day
    cron.schedule('59 23 * * *', async () => {
        console.log('Running Daily Sales Report Cron Job...');

        try {
            // Get the start of today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Get all owners
            const owners = await User.find({ role: 'owner' });

            for (const owner of owners) {
                if (!owner.tenantId) continue;

                // 2. Get today's invoices for this tenant
                const invoices = await Invoice.find({
                    tenantId: owner.tenantId,
                    createdAt: { $gte: today }
                });

                if (invoices.length === 0) {
                    console.log(`No sales today for owner ${owner.email}, skipping report.`);
                    continue;
                }

                // 3. Aggregate data
                const totalRevenue = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
                const totalTransactions = invoices.length;

                const methods = ['Cash', 'UPI', 'Card'];
                const methodBreakdown = methods.map(m => ({
                    name: m,
                    amount: invoices.filter(inv => inv.paymentMethod === m).reduce((acc, inv) => acc + inv.totalAmount, 0)
                })).filter(m => m.amount > 0);

                // 4. Send the report
                await sendDailySalesReport(owner, {
                    totalRevenue,
                    totalTransactions,
                    methodBreakdown
                });

                // 5. Create In-App Notification
                try {
                    await Notification.create({
                        recipient: owner._id,
                        title: 'Daily Sales Report Ready',
                        message: `Your report for today is ready. Total Revenue: ₹${totalRevenue.toLocaleString()} across ${totalTransactions} transactions.`,
                        type: 'info'
                    });
                } catch (notifErr) {
                    console.error('Failed to create daily report notification:', notifErr);
                }
            }
        } catch (error) {
            console.error('Error in Daily Sales Report Cron Job:', error);
        }
    });

    console.log('Cron tasks initialized.');
};

module.exports = { initCronTasks };
