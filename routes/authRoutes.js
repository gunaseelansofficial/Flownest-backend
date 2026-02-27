const express = require('express');
const { registerOwner, loginUser, logoutUser } = require('../controllers/authController');
const router = express.Router();

router.post('/register', registerOwner);
router.post('/login', loginUser);
router.get('/logout', logoutUser);

module.exports = router;
