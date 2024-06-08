import { adminSecretKey } from "../app.js";
import { tryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { cookieOption } from "../utils/features.js";
import { ErrorHandler, returnFn } from "../utils/utility.js";
import jwt from "jsonwebtoken";

const adminLogin = tryCatch(async(req, res, next) => {
    const { secretKey } = req.body;
    const isMatched = secretKey === adminSecretKey;
    if(!isMatched) return next(new ErrorHandler("Invalid Admin Key", 401));
    const token = jwt.sign(secretKey, process.env.JWT_SECRET);
    
    return res
        .status(200)
        .cookie("app-admin-token", token, {...cookieOption, maxAge: 1000*60*15 })
        .json({ success: true, message: "Authentication successfull, Welcome Boss" })
})

const adminLogout = tryCatch(async(req, res, next) => {
    return res
        .status(200)
        .cookie("app-admin-token", "", {...cookieOption, maxAge: 0 })
        .json({ success: true, message: "Logged out successfully" })
})

const getAdminData = tryCatch(async(req, res, next) => {
    return res.status(200).json({ admin: true });
})

const allUsers = tryCatch(async(req, res) => {
    const users = await User.find({});
    const transfromedUsers = await Promise.all(users.map(async({name, username, avatar, _id}) => {
        const [groups, friends] = await Promise.all([
            Chat.countDocuments({ groupChat: true, members: _id }),
            Chat.countDocuments({ groupChat: false, members: _id }),
        ]);
        return { name, username, avatar: avatar.url, _id, groups, friends }
    }));

    returnFn(res, {users: transfromedUsers});
});

const allChats = tryCatch(async(req, res) => {
    const chats = await Chat.find({})
        .populate("members", "name avatar")
        .populate("creator", "name avatar")
    
    const transformedChats = await Promise.all(chats.map(async ({ members, _id, groupChat, name, creator }) => {
        const totalMessages =  await Message.countDocuments({ chat: _id });
        return { 
            _id, groupChat, name, 
            avatar: members.slice(0, 3).map((member) => member.avatar.url),
            members: members.map(({ _id, name, avatar }) => ({
                _id, name, avatar: avatar.url
            })),
            creator: {
                name: creator?.name || "None",
                avatar: creator?.avatar.url || "",
            },
            totalMembers: members.length,
            totalMessages,
        }
    }))

    returnFn(res, {chats: transformedChats});
})

const allMessages = tryCatch(async(req, res) => {
    const messages = await Message.find({})
        .populate("sender", "name avatar")
        .populate("chat", "groupChat")

    const transformedMessages = messages.map(({ content, attachment, _id, sender, chat, createdAt }) => ({
        _id, attachment, content, createdAt,
        chat: chat._id, groupChat: chat.groupChat,
        sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url
        }
    }))  
        
    returnFn(res, {messages: transformedMessages});
})

const getDashboardStats = tryCatch(async(req, res) => {
    const [groupsCount, usersCount, messagesCount, totalChatsCount] = await Promise.all([
        Chat.countDocuments({ groupChat: true }),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments(),
    ])

    const today = new Date();
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const last7DaysMessages = await Message.find({
        createdAt: { $gte: last7Days, $lte: today }
    }).select("createdAt");

    const messages = new Array(7).fill(0);
    const dayInMilliseconds = 1000 * 60 * 60 * 24;
    last7DaysMessages.forEach(message => {
        const approxIndex = (today.getTime()-message.createdAt.getTime()) / dayInMilliseconds;
        const index = Math.floor(approxIndex);

        messages[6-index]++;
    })

    const stats = { groupsCount, usersCount, messagesCount, totalChatsCount, messagesChart: messages };

    returnFn(res, {stats: stats});
})

export { adminLogin, adminLogout, getAdminData, allUsers, allChats, allMessages, getDashboardStats };