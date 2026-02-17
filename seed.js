const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const dns = require('dns');

// Force Google DNS to resolve Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

// Import models
const User = require('./models/User');
const Tenant = require('./models/Tenant');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/flownest');
        console.log('MongoDB Connected');
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const seedDatabase = async () => {
    try {
        await connectDB();

        // Clear existing data
        await User.deleteMany({});
        await Tenant.deleteMany({});
        console.log('✓ Cleared existing data');

        // Create Super Admin
        // Models pre-save hook handles hashing, so pass plaintext here
        const superAdmin = await User.create({
            name: 'Super Admin',
            email: 'admin@flownest.com',
            password: 'Admin@123',
            role: 'superadmin',
            tenantId: null,
        });
        console.log('✓ Created Super Admin');
        console.log('  Email: admin@flownest.com');
        console.log('  Password: Admin@123');

        // Create Test Owner with Tenant
        const testOwner = await User.create({
            name: 'Test Owner',
            email: 'owner@test.com',
            password: 'owner123',
            role: 'owner',
        });

        const testTenant = await Tenant.create({
            name: 'Test Shop',
            businessType: 'Salon',
            owner: testOwner._id,
            subscriptionStatus: 'active',
            subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });

        testOwner.tenantId = testTenant._id;
        await testOwner.save();

        console.log('✓ Created Test Owner');
        console.log('  Email: owner@test.com');
        console.log('  Password: owner123');
        console.log('  Shop: Test Shop');

        console.log('\n✅ Database seeded successfully!');
        console.log('\nYou can now login with:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Super Admin:');
        console.log('  Email: admin@flownest.com');
        console.log('  Password: Admin@123');
        console.log('\nTest Owner:');
        console.log('  Email: owner@test.com');
        console.log('  Password: owner123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
