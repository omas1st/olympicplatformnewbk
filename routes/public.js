const express = require('express');
const publicController = require('../controllers/publicController');
const router = express.Router();

router.get('/winning-numbers', publicController.getWinningNumbers);
router.get('/results', publicController.getResults);
router.get('/past-winning', publicController.getPastWinning);
router.get('/carousel', publicController.getCarousel);

module.exports = router;