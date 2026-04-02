import express from 'express';
import { register, login, me } from '../controllers/authController.js';
import { validate, registerSchema, loginSchema } from '../validations/authValidation.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, me);

export default router;