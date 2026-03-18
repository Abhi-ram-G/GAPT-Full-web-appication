const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');

// Example route
router.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Add more routes here or import from other route files
router.use('/auth', authRoutes);

module.exports = router;
