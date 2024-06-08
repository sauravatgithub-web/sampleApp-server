import express from 'express';
import { isAuthenticated } from '../middlewares/auth.js';
import { 
    addMembers, 
    deleteChat, 
    getChatDetails, 
    getMessages, 
    getMyChat, 
    getMyGroups, 
    leaveGroup, 
    newGroupChat, 
    removeMembers, 
    renameGroup, 
    sendAttachment
} from '../controllers/chat.js';
import { attachmentsMulter } from '../middlewares/multer.js';
import { 
    addMemberValidator, 
    idValidator,
    newGroupValidator, 
    removeMemberValidator, 
    renameValidator, 
    sendAttachmentValidator, 
    validate 
} from '../lib/validator.js';

const router = express.Router();

router.use(isAuthenticated);
router.post("/new", newGroupValidator(), validate, newGroupChat);
router.get("/my", getMyChat);
router.get("/my/groups", getMyGroups);
router.put("/addMembers", addMemberValidator(), validate, addMembers);
router.put("/removeMember", removeMemberValidator(), validate, removeMembers);
router.delete("/leave/:id", idValidator(), validate, leaveGroup);

router.post("/message", attachmentsMulter, sendAttachmentValidator(), validate, sendAttachment)
router.get("/message/:id", idValidator(), validate, getMessages)

// DYNAMIC ROUTES ARE TO BE KEPT AT END
router
    .route("/:id")
    .get(idValidator(), validate, getChatDetails)
    .put(renameValidator(), validate, renameGroup)
    .delete(idValidator(), validate, deleteChat);

export default router;