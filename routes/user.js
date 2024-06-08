import express from 'express';
import { acceptRequest, getMyFriends, getMyProfile, getNotifications, logOut, login, newUser, searchUser, sendRequest } from '../controllers/user.js'
import { singleAvatar } from '../middlewares/multer.js';
import { isAuthenticated } from '../middlewares/auth.js';
import { acceptRequestValidator, loginValidator, registerValidator, sendRequestValidator, validate } from '../lib/validator.js';
const router = express.Router();

// user must not be logged in
router.post('/new', singleAvatar, registerValidator(), validate, newUser);
router.post('/login', loginValidator(), validate, login)

// user must be logged in
router.use(isAuthenticated); // now on wards every route will use this middleware
router.get("/me", getMyProfile);
router.get("/logOut", logOut);
router.get("/searchUser", searchUser);
router.put("/sendRequest", sendRequestValidator(), validate, sendRequest);
router.put("/acceptRequest", acceptRequestValidator(), validate, acceptRequest);
router.get("/notifications", getNotifications);
router.get('/friends', getMyFriends);

export default router;