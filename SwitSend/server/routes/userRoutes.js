import express from 'express';
import { User } from '../models/index.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { Op } from 'sequelize';

const router = express.Router();

router.use(authenticate);

// Search users by email or name
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, data: { users: [] } });
    }

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { email: { [Op.like]: `%${q}%` } },
          { name: { [Op.like]: `%${q}%` } }
        ],
        id: { [Op.ne]: req.user.id } // Exclude current user
      },
      attributes: ['id', 'name', 'email'],
      limit: 10
    });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
