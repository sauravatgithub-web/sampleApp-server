import express from 'express';
import { adminLogin, adminLogout, allChats, allMessages, allUsers, getAdminData, getDashboardStats } from '../controllers/admin.js';
import { adminLoginValidator, validate } from '../lib/validator.js';
import { isAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.post("/verify", adminLoginValidator(), validate, adminLogin);
router.get("/logout", adminLogout);

// only admin can access
router.use(isAdmin);
router.get("/", getAdminData);
router.get("/users", allUsers);
router.get("/chats", allChats);
router.get("/messages", allMessages);
router.get("/stats", getDashboardStats);

export default router;