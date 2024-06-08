import { body, param, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validate = (req, res, next) => {
    const errors = validationResult(req);
    const errorMsg = errors.array().map((error) => error.msg).join(", ");
    
    if(errors.isEmpty()) return next();
    else next(new ErrorHandler(errorMsg, 400))
}

const registerValidator = () => [
    body("name", "Please enter name").notEmpty(),
    body("username", "Please enter username").notEmpty(),
    body("bio", "Please enter bio").notEmpty(),
    body("password", "Please enter password").notEmpty(),
];

const loginValidator = () => [
    body("username", "Please enter username").notEmpty(),
    body("password", "Please enter password").notEmpty(),
];

const newGroupValidator = () => [
    body("name", "Please enter name").notEmpty(),
    body("members")
        .notEmpty().withMessage("Please enter members")
        .isArray({ min: 2, max: 100 }).withMessage('Members must be within 2 to 100')
];

const addMemberValidator = () => [
    body("chatId", "Please enter chatId").notEmpty(),
    body("members")
        .notEmpty().withMessage("Please enter members")
        .isArray({ min: 1, max: 97 }).withMessage('Members must be within 1 to 97')
];

const removeMemberValidator = () => [
    body("chatId", "Please enter chatId").notEmpty(),
    body("userId", "Please enter userId").notEmpty(),
];

const idValidator = () => [
    param("id", "Please enter chatId").notEmpty(),
];

const sendAttachmentValidator = () => [
    body("chatId", "Please enter chatId").notEmpty(),
];

const renameValidator = () => [
    param("id", "Please enter chatId").notEmpty(),
    body("name", "Please enter new name").notEmpty(),
]

const sendRequestValidator = () => [
    body("userId", "Please enter userId").notEmpty(),
]

const acceptRequestValidator = () => [
    body("requestId", "Please enter requestId").notEmpty(),
    body("accept", "Please add accept")
        .notEmpty().withMessage("Please accept message")
        .isBoolean().withMessage("Accept must be boolean")
]

const adminLoginValidator = () => [
    body("secret", "Please enter secret key").isEmpty()
]

export { 
    adminLoginValidator,
    acceptRequestValidator,
    addMemberValidator,
    idValidator,
    loginValidator, 
    newGroupValidator,
    removeMemberValidator,
    registerValidator, 
    renameValidator,
    sendAttachmentValidator,
    sendRequestValidator,
    validate 
}