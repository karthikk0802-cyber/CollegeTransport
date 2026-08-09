const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'development_secret_key_1234567890_college_bus', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (for development/testing setup, we can keep it open)
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, rollNumber } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Check rollNumber uniqueness if student
    if (role === 'student' && rollNumber) {
      const rollExists = await User.findOne({ rollNumber });
      if (rollExists) {
        return res.status(400).json({ success: false, message: 'Roll number already registered' });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      rollNumber,
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          rollNumber: user.rollNumber,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for email and password
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Find user and select password (since it is excluded by default)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        rollNumber: user.rollNumber,
        assignedBus: user.assignedBus,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('assignedBus');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('GetMe error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
