import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { User } from '../models/user.model.js';
import { generateToken } from '../utils/generateToken.js';
import bcrypt from 'bcryptjs';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, address } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, Email, and Password are required');
  }

  // 1. Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(409, 'User with this email already exists'); // 409 Conflict
  }

  // 2. Create new user
  // The 'pre' hook in user.model.js will automatically hash the password
  const user = await User.create({
    name,
    email,
    password,
    phone,
    address,
  });

  // 3. Generate token
  const token = generateToken(user._id, user.role);

  // 4. Send response (don't send back the password)
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: token,
  };

  return res
    .status(201)
    .json(new ApiResponse(201, userResponse, 'User registered successfully'));
});

/**
 * @desc    Authenticate (login) a user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and Password are required');
  }

  // 1. Find user by email
  // We must .select('+password') because it's hidden by default in the model
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password'); // 401 Unauthorized
  }

  // 2. Compare password
  // We need to use bcrypt.compare, not the model method, 
  // because we selected the password manually.
  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // 3. Generate token
  const token = generateToken(user._id, user.role);

  // 4. Send response
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: token,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, userResponse, 'User logged in successfully'));
});

export { registerUser, loginUser };