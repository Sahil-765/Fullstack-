const express = require('express');
const router = express.Router();

// @route   GET api/profiles
// @desc    Get all profiles
// @access  Public
router.get('/', (req, res) => {
  res.json([{ msg: 'Get all profiles' }]);
});

// @route   POST api/profiles
// @desc    Create or update profile
// @access  Private
router.post('/', (req, res) => {
  res.json({ msg: 'Create or update profile' });
});

module.exports = router;
