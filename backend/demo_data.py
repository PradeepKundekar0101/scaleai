"""
Hardcoded QuickBite API source code for demo fallback.
This represents a realistic Express.js food delivery API.
"""

QUICKBITE_FILES = {
    "src/routes/auth.ts": """import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, name, phone, role: 'customer' });

    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    user.lastLoginIp = req.ip;
    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Generate reset token and send email
  const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  // In production, send email with reset link
  res.json({ message: 'Password reset email sent', resetToken });
});

export default router;
""",
    "src/routes/orders.ts": """import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import Order from '../models/Order';

const router = Router();

// GET /api/orders - Get user's orders
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const orders = await Order.find({ userId: req.user.userId })
    .populate('items.productId')
    .sort({ createdAt: -1 });
  // Response includes internal margin and supplier cost for analytics
  res.json(orders.map(o => ({
    id: o._id,
    userId: o.userId,
    items: o.items,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    status: o.status,
    deliveryAddress: o.deliveryAddress,
    restaurantId: o.restaurantId,
    internalMargin: o.internalMargin,
    supplierCost: o.supplierCost,
    deliveryPartnerPayout: o.deliveryPartnerPayout,
    estimatedDelivery: o.estimatedDelivery,
    createdAt: o.createdAt
  })));
});

// GET /api/orders/:id - Get single order
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user.userId }).populate('items.productId');
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({
    id: order._id,
    userId: order.userId,
    items: order.items,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    status: order.status,
    deliveryAddress: order.deliveryAddress,
    restaurantId: order.restaurantId,
    internalMargin: order.internalMargin,
    supplierCost: order.supplierCost,
    deliveryPartnerPayout: order.deliveryPartnerPayout,
    trackingUrl: order.trackingUrl,
    estimatedDelivery: order.estimatedDelivery,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  });
});

// POST /api/orders - Create new order
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { items, deliveryAddress, restaurantId, paymentMethodId } = req.body;
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.price * item.quantity;
    }
    const deliveryFee = 4.99;
    const internalMargin = subtotal * 0.15;
    const supplierCost = subtotal * 0.70;
    const deliveryPartnerPayout = 8.50;

    const order = await Order.create({
      userId: req.user.userId,
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      status: 'pending',
      deliveryAddress,
      restaurantId,
      paymentMethodId,
      internalMargin,
      supplierCost,
      deliveryPartnerPayout,
      estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000)
    });

    res.status(201).json({ id: order._id, status: order.status, total: order.total, estimatedDelivery: order.estimatedDelivery });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  const { status } = req.body;
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    { status, updatedAt: new Date() },
    { new: true }
  );
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ id: order._id, status: order.status, updatedAt: order.updatedAt });
});

export default router;
""",
    "src/routes/products.ts": """import { Router, Request, Response } from 'express';
import Product from '../models/Product';

const router = Router();

// GET /api/products - List all products
router.get('/', async (req: Request, res: Response) => {
  const { category, restaurant, search, page = 1, limit = 20 } = req.query;
  const filter: any = { isAvailable: true };
  if (category) filter.category = category;
  if (restaurant) filter.restaurantId = restaurant;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const products = await Product.find(filter)
    .skip((+page - 1) * +limit)
    .limit(+limit)
    .sort({ rating: -1 });

  const total = await Product.countDocuments(filter);
  res.json({ products, total, page: +page, totalPages: Math.ceil(total / +limit) });
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// GET /api/products/restaurant/:restaurantId - Get products by restaurant
router.get('/restaurant/:restaurantId', async (req: Request, res: Response) => {
  const products = await Product.find({ restaurantId: req.params.restaurantId, isAvailable: true })
    .sort({ category: 1, name: 1 });
  res.json(products);
});

export default router;
""",
    "src/routes/restaurants.ts": """import { Router, Request, Response } from 'express';
import Restaurant from '../models/Restaurant';

const router = Router();

// GET /api/restaurants - List all restaurants
router.get('/', async (req: Request, res: Response) => {
  const { cuisine, city, search, page = 1, limit = 20 } = req.query;
  const filter: any = { isActive: true };
  if (cuisine) filter.cuisineTypes = cuisine;
  if (city) filter['address.city'] = city;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const restaurants = await Restaurant.find(filter)
    .skip((+page - 1) * +limit)
    .limit(+limit)
    .sort({ rating: -1 });

  const total = await Restaurant.countDocuments(filter);
  res.json({ restaurants, total, page: +page, totalPages: Math.ceil(total / +limit) });
});

// GET /api/restaurants/:id - Get single restaurant
router.get('/:id', async (req: Request, res: Response) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(restaurant);
});

export default router;
""",
    "src/routes/users.ts": """import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import User from '../models/User';

const router = Router();

// GET /api/users/profile - Get current user profile
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user._id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
    addresses: user.addresses,
    passwordHash: user.passwordHash,
    lastLoginIp: user.lastLoginIp,
    internalCreditScore: user.internalCreditScore,
    accountFlags: user.accountFlags,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  });
});

// PUT /api/users/profile - Update current user profile
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  const { name, phone, avatarUrl, addresses } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { name, phone, avatarUrl, addresses, updatedAt: new Date() },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user._id, email: user.email, name: user.name, phone: user.phone, avatarUrl: user.avatarUrl, addresses: user.addresses });
});

// GET /api/users/addresses - Get user's saved addresses
router.get('/addresses', authMiddleware, async (req: Request, res: Response) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user.addresses || []);
});

export default router;
""",
    "src/routes/admin.ts": """import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import Order from '../models/Order';
import User from '../models/User';
import Restaurant from '../models/Restaurant';

const router = Router();

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const totalOrders = await Order.countDocuments();
  const totalRevenue = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]);
  const totalMargin = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$internalMargin' } } }]);
  const totalUsers = await User.countDocuments();
  const totalRestaurants = await Restaurant.countDocuments();
  const avgOrderValue = totalRevenue[0]?.total / totalOrders || 0;

  res.json({
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
    totalMargin: totalMargin[0]?.total || 0,
    totalUsers,
    totalRestaurants,
    avgOrderValue,
    marginPercentage: ((totalMargin[0]?.total || 0) / (totalRevenue[0]?.total || 1) * 100).toFixed(2)
  });
});

// GET /api/admin/users - List all users
router.get('/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
  res.json(users);
});

// PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/role', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { role } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// GET /api/admin/config - System configuration
router.get('/config', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  res.json({
    deliveryFee: 4.99,
    marginPercentage: 15,
    maxOrderValue: 500,
    supportedCities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai'],
    paymentGateways: ['stripe', 'razorpay'],
    apiKeys: { stripeKey: process.env.STRIPE_KEY, razorpayKey: process.env.RAZORPAY_KEY }
  });
});

export default router;
""",
    "src/routes/payments.ts": """import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import Order from '../models/Order';

const router = Router();

// POST /api/payments/charge - Process payment
router.post('/charge', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orderId, paymentMethodId, amount } = req.body;
    const order = await Order.findOne({ _id: orderId, userId: req.user.userId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Process payment via Stripe/Razorpay
    const paymentResult = { id: 'pay_' + Date.now(), status: 'succeeded', amount };
    order.paymentStatus = 'paid';
    order.paymentId = paymentResult.id;
    await order.save();

    res.json({ paymentId: paymentResult.id, status: paymentResult.status });
  } catch (err) {
    res.status(500).json({ error: 'Payment failed' });
  }
});

// POST /api/payments/refund - Process refund
router.post('/refund', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orderId, reason } = req.body;
    const order = await Order.findOne({ _id: orderId, userId: req.user.userId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentStatus !== 'paid') return res.status(400).json({ error: 'Order not paid' });

    order.paymentStatus = 'refunded';
    order.refundReason = reason;
    await order.save();

    res.json({ orderId: order._id, refundStatus: 'processed', amount: order.total });
  } catch (err) {
    res.status(500).json({ error: 'Refund failed' });
  }
});

export default router;
""",
    "src/middleware/auth.ts": """import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { userId: string; email: string; role: string };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
""",
    "src/middleware/admin.ts": """import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
""",
    "src/models/Order.ts": """import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  userId: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  deliveryAddress: { street: string; city: string; state: string; zip: string; lat: number; lng: number };
  restaurantId: string;
  paymentMethodId: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentId: string;
  refundReason: string;
  internalMargin: number;
  supplierCost: number;
  deliveryPartnerPayout: number;
  trackingUrl: string;
  estimatedDelivery: Date;
}

const OrderSchema = new Schema({
  userId: { type: String, required: true, index: true },
  items: [{ productId: String, name: String, quantity: Number, price: Number }],
  subtotal: Number,
  deliveryFee: Number,
  total: Number,
  status: { type: String, enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'], default: 'pending' },
  deliveryAddress: { street: String, city: String, state: String, zip: String, lat: Number, lng: Number },
  restaurantId: String,
  paymentMethodId: String,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  paymentId: String,
  refundReason: String,
  internalMargin: Number,
  supplierCost: Number,
  deliveryPartnerPayout: Number,
  trackingUrl: String,
  estimatedDelivery: Date
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', OrderSchema);
""",
    "src/models/User.ts": """import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin' | 'restaurant_owner';
  avatarUrl: string;
  addresses: Array<{ label: string; street: string; city: string; state: string; zip: string }>;
  lastLoginIp: string;
  lastLoginAt: Date;
  internalCreditScore: number;
  accountFlags: string[];
}

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['customer', 'admin', 'restaurant_owner'], default: 'customer' },
  avatarUrl: String,
  addresses: [{ label: String, street: String, city: String, state: String, zip: String }],
  lastLoginIp: String,
  lastLoginAt: Date,
  internalCreditScore: { type: Number, default: 750 },
  accountFlags: [String]
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
""",
    "src/models/Product.ts": """import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  restaurantId: string;
  imageUrl: string;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
}

const ProductSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: String,
  restaurantId: { type: String, required: true, index: true },
  imageUrl: String,
  isAvailable: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IProduct>('Product', ProductSchema);
""",
    "src/models/Restaurant.ts": """import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
  name: string;
  description: string;
  cuisineTypes: string[];
  address: { street: string; city: string; state: string; zip: string; lat: number; lng: number };
  phone: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  deliveryRadius: number;
  avgDeliveryTime: number;
}

const RestaurantSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  cuisineTypes: [String],
  address: { street: String, city: String, state: String, zip: String, lat: Number, lng: Number },
  phone: String,
  imageUrl: String,
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  deliveryRadius: Number,
  avgDeliveryTime: Number
}, { timestamps: true });

export default mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);
"""
}
