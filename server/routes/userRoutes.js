const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const ALLOWED_AVAILABILITY = ['looking', 'matched', 'not-looking'];

const serializeUserProfile = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  gender: user.gender || null,
  age: typeof user.age === 'number' ? user.age : null,
  city: user.city || '',
  budget: typeof user.budget === 'number' ? user.budget : null,
  bio: user.bio || '',
  preferences: user.preferences || '',
  availability: user.availability,
  interests: Array.isArray(user.interests) ? user.interests : [],
  updatedAt: user.updatedAt,
  createdAt: user.createdAt
});

// @route   GET api/users
// @desc    Get all users
// @access  Public (temporarily)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
  const normalizedName = req.body.name?.trim();
  const normalizedEmail = req.body.email?.trim().toLowerCase();
  const normalizedPassword = req.body.password?.trim();

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
  }

  try {
    // Check if user exists
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user
    user = new User({
      name: normalizedName,
      email: normalizedEmail,
      password: normalizedPassword
    });

    // Save user to database
    await user.save();

    // Create token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/users/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password?.trim();

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Create token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: serializeUserProfile(req.user)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const allowedFields = [
      'name',
      'phone',
      'gender',
      'age',
      'city',
      'budget',
      'bio',
      'preferences',
      'availability',
      'interests'
    ];

    const updates = {};

    allowedFields.forEach(field => {
      if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
        return;
      }
      const incomingValue = req.body[field];

      if (incomingValue === undefined || incomingValue === null) {
        return;
      }

      let value = incomingValue;
      if (typeof value === 'string') {
        value = value.trim();
      }

      if (['name', 'phone', 'city', 'bio', 'preferences'].includes(field)) {
        updates[field] = value;
        return;
      }

      if (field === 'gender') {
        updates[field] = value || null;
        return;
      }

      if (field === 'availability') {
        if (value && !ALLOWED_AVAILABILITY.includes(value)) {
          return;
        }
        updates[field] = value || 'looking';
        return;
      }

      if (['age', 'budget'].includes(field)) {
        if (value === '') {
          return;
        }
        const numericValue = Number(value);
        if (!Number.isNaN(numericValue)) {
          updates[field] = numericValue;
        }
        return;
      }

      if (field === 'interests') {
        updates[field] = value;
      }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, 'age') && (req.body.age === '' || req.body.age === null)) {
      updates.age = undefined;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'budget') && (req.body.budget === '' || req.body.budget === null)) {
      updates.budget = undefined;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    if (updates.name === '') {
      return res.status(400).json({ success: false, message: 'Name cannot be empty' });
    }

    if (updates.interests) {
      const interestsValue = updates.interests;
      if (Array.isArray(interestsValue)) {
        updates.interests = interestsValue.filter(Boolean).map(item => item.trim()).slice(0, 10);
      } else if (typeof interestsValue === 'string') {
        updates.interests = interestsValue
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
          .slice(0, 10);
      } else {
        delete updates.interests;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: serializeUserProfile(updatedUser)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/users/roommates
// @desc    Find roommates based on optional filters
// @access  Private
router.get('/roommates', protect, async (req, res) => {
  try {
    const { city, gender, budgetMax } = req.query;

    const filter = {
      _id: { $ne: req.user._id },
      availability: { $ne: 'not-looking' }
    };

    if (city) {
      filter.city = { $regex: new RegExp(city.trim(), 'i') };
    }

    if (gender && gender !== 'any') {
      filter.gender = gender;
    }

    if (budgetMax) {
      const maxValue = Number(budgetMax);
      if (!Number.isNaN(maxValue)) {
        filter.budget = { $lte: maxValue };
      }
    }

    const roommates = await User.find(filter)
      .select('-password')
      .sort('-updatedAt')
      .limit(25);

    res.status(200).json({
      success: true,
      data: roommates.map(serializeUserProfile)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
