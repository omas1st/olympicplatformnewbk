const validateRegistration = (req, res, next) => {
  const { name, email, password, whatsapp, country, sex, occupation, age } = req.body;

  if (!name || !email || !password || !whatsapp || !country || !sex || !occupation || !age) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  if (age < 18) {
    return res.status(400).json({ message: 'You must be at least 18 years old to register' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  next();
};

const validateWinningNumbers = (req, res, next) => {
  const { lunchtime, teatime, goslotto536, goslotto749, powerball } = req.body;

  if (!lunchtime || !teatime || !goslotto536 || !goslotto749 || !powerball) {
    return res.status(400).json({ message: 'All lottery types are required' });
  }

  // Validate array lengths
  if (lunchtime.length !== 4 || teatime.length !== 4 || 
      goslotto536.length !== 4 || goslotto749.length !== 4 || powerball.length !== 4) {
    return res.status(400).json({ message: 'Each lottery type must have exactly 4 numbers' });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateWinningNumbers
};