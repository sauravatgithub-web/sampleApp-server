//create a new user and save it in the database
import bcrypt from 'bcrypt'
import { User } from '../models/user.js'
import { cookieOption, emitEvent, sendToken, uploadFilesFromCloudinary } from '../utils/features.js';
import { tryCatch } from '../middlewares/error.js';
import { ErrorHandler } from '../utils/utility.js';
import { Chat } from '../models/chat.js';
import { Request } from '../models/request.js'
import { NEW_REQUEST, REFETCH_CHATS } from '../constants/events.js';
import { getOtherMember } from '../lib/helper.js';

const newUser = tryCatch(async (req, res, next) => {
    const {name, username, password, bio} = req.body;

    const file = req.file;
    if(!file) return next(new ErrorHandler('Please upload avatar'));

    const result = await uploadFilesFromCloudinary([file]);
    if(!result) console.log("No Result");
    else console.log("result");

    const avatar = {
        public_id: result[0].public_id,
        url: result[0].url,
    };

    const user = await User.create({
        name,
        username,
        password,
        bio,
        avatar,
    });

    sendToken(res, user, 201, "User created");
});

const login = tryCatch(async(req, res, next) => {
    const {username, password} = req.body;
    if (!username || !password) {
        return next(new ErrorHandler("Username and password are required", 404));
    }

    const user = await User.findOne({ username }).select("+password");
    if(!user) return next(new ErrorHandler("Invalid credentials", 404));

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) return next(new ErrorHandler("Invalid credentials", 404));

    sendToken(res, user, 200, `Welcome back, ${user.name}`);
    return user;
})


const getMyProfile = tryCatch(async(req, res) => {
    const user = await User.findById(req.user);  
    res.status(200).json({
        success: true,
        user
    })
});

const logOut = tryCatch(async(req, res) => {
    return res
        .status(200)
        .cookie('app-token', "", { ...cookieOption, maxAge: 0})
        .json ({
            success: true,
            message: "Logged out successfully",
        });
});

const searchUser = tryCatch(async(req, res) => {
    const {name = ""} = req.query;

    const myChats = await Chat.find({ groupChat: false, members: req.user });
    const allUserFromChats = myChats.flatMap((chat) => chat.members); // friends
    
    const otherUsers = await User.find({ // no friends
        _id: { $nin: allUserFromChats },
        name: { $regex: name, $options: "i" },
    }); 
    const users = otherUsers.map(({ _id, name, avatar }) => ({
        _id,
        name, 
        avatar: avatar.url,
    }))

    res.status(200).json({ success: true, users: users });
})

const sendRequest = tryCatch(async(req, res, next) => {
    const { userId } = req.body;
    const request = await Request.findOne({
        $or: [
            { sender: req.user, reciever: userId },
            { sender: userId, reciever: req.user },
        ],
    });
    if(request) return next(new ErrorHandler("Request already sent", 400));

    await Request.create({
        sender: req.user,
        reciever: userId,
    })

    emitEvent(req, NEW_REQUEST, [userId]);

    res.status(200).json({ success: true, message: "Request sent successfully" })
})

const acceptRequest = tryCatch(async(req, res, next) => {
    const { requestId, accept } = req.body;
    const request = await Request.findById(requestId)
        .populate('sender', "name")
        .populate('reciever', 'name')

    if(request.reciever._id.toString() !== req.user.toString()) 
        return next(new ErrorHandler("You are unauthorized to do it.", 404));

    if(!accept) {
        await request.deleteOne();
        return res.status(200).json({ success: true, message: "Friend request rejected" })
    }

    const members = [request.sender._id, request.reciever._id];
    await Promise.all([
        Chat.create({
            members, 
            name: `${request.sender.name}-${request.reciever.name}`,
        }),
        request.deleteOne(),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({ success: true, message: "Friend Request Accepted", senderId: request.sender._id })
})

const getNotifications = tryCatch(async(req, res) => {
    const requests = await Request.find({ reciever: req.user }).populate("sender", "name avatar");
    const allRequests = requests.map(({ _id, sender }) => ({
        _id: _id,
        sender: sender
    }))
    return res.status(200).json({ success: true, requests: allRequests })
})

const getMyFriends = tryCatch(async(req, res) => {
    const chatId = req.query.chatId;

    const chats = await Chat.find({
        members: req.user,
        groupChat: false,
    }).populate("members", "name avatar");

    const friends = chats.map(({members}) => {
        const otherUser = getOtherMember(members, req.user);
        return {
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar.url
        }
    });

    if(chatId) {
        const chat = await Chat.findById(chatId);
        const availaibleFriends = friends.filter((friend) => !chat.members.includes(friend._id));
        return res.status(200).json({ success: true, friends: availaibleFriends })
    }
    else {
        return res.status(200).json({ success: true, friends })
    }
})

export { acceptRequest, getMyProfile, getNotifications, getMyFriends, login, logOut, newUser, searchUser, sendRequest };