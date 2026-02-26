const express = require('express');
const router = express.Router();

// Example route
router.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Add more routes here or import from other route files

module.exports = router;
