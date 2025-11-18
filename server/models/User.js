const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', null],
      default: null
    },
    age: {
      type: Number,
      min: 18,
      max: 80
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    budget: {
      type: Number,
      min: 0
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    preferences: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    availability: {
      type: String,
      enum: ['looking', 'matched', 'not-looking'],
      default: 'looking'
    },
    interests: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password.trim(), salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

module.exports = mongoose.model('User', userSchema);
