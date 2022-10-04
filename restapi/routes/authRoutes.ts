import express from 'express';
import * as authController from '../controllers/authController';

const router = express.Router();

//Login Route
router.post('/login', authController.login);

//Signup Route
router.post('/signup', authController.signup);

//Logout Route
router.get('/logout', authController.logout);

router.get('/alive', (req, res) => {
  console.log('I am alive');
  res.status(200).json({ message: 'I am alive' });
});

export default router;
