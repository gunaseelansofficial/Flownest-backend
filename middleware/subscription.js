const Tenant = require('../models/Tenant');

const checkSubscription = async (req, res, next) => {
    try {
        const tenant = await Tenant.findById(req.user.tenantId);

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        const now = new Date();

        // Trial check
        const isTrialActive = tenant.trialExpiresAt && tenant.trialExpiresAt > now;

        // Subscription check
        const isSubscriptionActive = tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt > now;

        // Enforcement logic
        if (!isTrialActive && !isSubscriptionActive && !tenant.paymentApproved) {
            if (tenant.subscriptionStatus !== 'expired') {
                tenant.subscriptionStatus = 'expired';
                await tenant.save();
            }
            return res.status(403).json({
                message: 'Subscription expired',
                code: 'SUBSCRIPTION_EXPIRED'
            });
        }

        // Auto-fix status if it was expired but now is valid (e.g. trial still active)
        if (tenant.subscriptionStatus === 'expired' && (isTrialActive || isSubscriptionActive || tenant.paymentApproved)) {
            tenant.subscriptionStatus = tenant.paymentApproved ? 'active' : 'trial';
            await tenant.save();
        }

        next();
    } catch (err) {
        res.status(500).json({ message: 'Server error checking subscription' });
    }
};

module.exports = { checkSubscription };
