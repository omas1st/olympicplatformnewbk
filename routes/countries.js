const express = require('express');
const router = express.Router();

// List of countries
const countries = [
  'South Africa', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Italy', 'Spain', 'Russia', 'China', 'Japan', 'India',
  'Brazil', 'Mexico', 'Argentina', 'Nigeria', 'Egypt', 'Kenya', 'Ghana',
  // Add more countries as needed
];

// Get all countries
router.get('/', (req, res) => {
  res.json(countries.sort());
});

module.exports = router;