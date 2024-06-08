import { User } from "../models/user.js"
import { Chat } from "../models/chat.js"
import { Message } from "../models/message.js";
import { tryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { deleteFilesFromCloudinary, emitEvent, uploadFilesFromCloudinary } from "../utils/features.js";
import { getOtherMember } from "../lib/helper.js";

const getMyChat = tryCatch( async(req, res, next) => {
    const chats = await Chat.find({ members: req.user }).populate(
        "members", 
        "name avatar"
    );

    const transformedChats = chats.map(({ _id, name, members, groupChat }) => {

        const otherMember = getOtherMember(members, req.user);

        return {
            _id,
            groupChat, 
            avatar: groupChat ? members.slice(0, 3).map(({avatar}) => avatar.url) : [otherMember.avatar.url],
            name: groupChat ? name : otherMember.name,
            members: members.reduce((prev, curr) => {
                if(curr._id.toString() !== req.user.toString()) {
                    prev.push(curr._id);
                }
                return prev;
            }, []),
        }
    })

    return res.status(200).json({success: true, chats: transformedChats});
})

const newGroupChat = tryCatch( async(req, res, next) => {
    const { name, members } = req.body;
    if(members.length < 2) return next(new ErrorHandler("Group Chat must have atleast 2 element", 400));

    const allMembers = [ ...members, req.user ];

    const group = await Chat.create({
        name, 
        groupChat: true,
        creator: req.user,
        members: allMembers,
    })

    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
    emitEvent(req, REFETCH_CHATS, members);

    return res.status(201).json({
        success: true,
        message: "New Group Created",
    })
})

const getMyGroups = tryCatch(async(req, res, next) => {
    const chats = await Chat.find({
        members: req.user,
        groupChat: true,
        creator: req.user,
    }).populate("members", "name avatar");

    const groups = chats.map(({ members, _id, groupChat, name }) => ({
        _id, 
        groupChat,
        name,
        avatar : members.slice(0, 3).map(({ avatar }) => avatar.url),
    }));

    return res.status(200).json({ success: true, groups});
})

const addMembers = tryCatch(async(req, res, next) => {
    const { chatId, members } = req.body;
    if(!members || members.length < 1) 
        return next(new ErrorHandler("Please provide members", 400));

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found", 404));
    if(!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 404));
    if(chat.creator.toString() !== req.user.toString()) 
        return next(new ErrorHandler('You are not allowed to add members', 403));

    const allNewMembersPromise = members.map((item) => User.findById(item, "name"));
    const allNewMembers = await Promise.all(allNewMembersPromise);
    const uniqueMembers = allNewMembers
        .filter((item) => !chat.members.includes(item._id.toString()))
        .map((item) => item._id);

    chat.members.push(...uniqueMembers);

    if(chat.members.length > 100)
        return next(new ErrorHandler("Group members limit is 100", 400));

    await chat.save();

    const allUsersName = allNewMembers.map((item) => item.name).join(",");

    emitEvent(req, ALERT, chat.members, {chatId, message: `${allUsersName} has been added to ${chat.name} group`});
    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({ success: true, message: "Members added successfully" });
})

const removeMembers = tryCatch(async(req, res, next) => {
    const { userId, chatId } = req.body;
    if (!userId || !chatId) {
        return next(new ErrorHandler("Invalid input data", 400));
    }

    const [chat, userThatWillBeRemoved] = await Promise.all([
        Chat.findById(chatId),
        User.findById(userId, "name"),
    ])

    if(!chat) return next(new ErrorHandler("Chat not found", 404));
    if(!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 400));
    if(chat.creator.toString() !== req.user.toString()) 
        return next(new ErrorHandler("You are not allowed to edit", 403));
    if(chat.members.length <= 3) return next(new ErrorHandler("Group must have atleast 3 members", 400));

    const allChatMembers = chat.members.map((i) => i.toString());

    chat.members = chat.members.filter(
        (member) => member.toString() !== userId.toString()
    );

    await chat.save();

    emitEvent(req, ALERT, chat.members, { chatId, message: `${userThatWillBeRemoved.name} has been removed from the group.`})
    emitEvent(req, REFETCH_CHATS, allChatMembers);

    return res.status(200).json({ success: true, message: "Member removed successfully" });
})

const leaveGroup = tryCatch(async(req, res, next) => {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);
    if(!chat) return next(new ErrorHandler("Chat not found", 404));
    if(!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 400));

    const remainingMembers = chat.members.filter(
        (member) => member.toString() !== req.user.toString()
    );
    if(remainingMembers < 3) return next(new ErrorHandler("Group must have atleast 3 members", 400));
    if(req.user.toString() == chat.creator.toString()) {
        const randomElement = Math.floor(Math.random() * remainingMembers.length);
        const newCreator = remainingMembers[randomElement];
        chat.creator = newCreator;
    }

    chat.members = remainingMembers;

    chat.members = chat.members.filter(
        (member) => member.toString() !== req.user.toString()
    );

    const [user] = await Promise.all([
        User.findById(req.user, "name"),
        chat.save()
    ]);

    emitEvent(req, ALERT, chat.members, { chatId, message: `${user} left the group.` })
    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({ success: true, message: "User removed successfully." });
})

const sendAttachment = tryCatch(async(req, res, next) => {
    const { chatId } = req.body;
    const files = req.files || [];

    const [chat, user] = await Promise.all([
        Chat.findById(chatId),
        User.findById(req.user),
    ]);

    if(!chat) return next(new ErrorHandler("Chat not found", 404));

    if(files.length < 1) return next(new ErrorHandler("No files to send", 400));
    if(files.length > 5) return next(new ErrorHandler("Files should be less than 5", 400));

    const attachment = await uploadFilesFromCloudinary(files);

    const messageForRealTime = { content: "", attachment, sender: { _id: user._id, name: user.name }, chat: chatId };

    const messageForDB = { content: "", attachment, sender: user._id, chat: chatId };
    const message = await Message.create(messageForDB);

    emitEvent(req, NEW_MESSAGE, chat.members, {
        message: messageForRealTime,
        chatId,
    })
    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

    return res.status(200).json({ success: true, message: message });
})

const getChatDetails = tryCatch(async(req, res, next) => {
    if(req.query.populate === "true") {
        const chat = await Chat.findById(req.params.id)
            .populate("members", "name avatar")
            .lean();
        if(!chat) return next(new ErrorHandler("Chat not found", 404));

        chat.members = chat.members.map(({ _id, name, avatar }) => ({
            _id,
            name,
            avatar: avatar.url
        }))

        return res.status(200).json({ success: true, chat });
    }
    else {
        const chat = await Chat.findById(req.params.id);
        if(!chat) return next(new ErrorHandler("Chat not found", 404));
        return res.status(200).json({ success: true, chat });
    }
})

const renameGroup = tryCatch(async(req, res, next) => {
    const chatId = req.params.id;
    const {name} = req.body;
    const chat = await Chat.findById(chatId);
    if(!chat) return next(new ErrorHandler("Chat not found", 404));
    if(!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 400));
    if(chat.creator.toString() !== req.user.toString()) 
        return next(new ErrorHandler("You are not allowed to edit", 403));

    chat.name = name;
    await chat.save();

    emitEvent(req, REFETCH_CHATS, chat.members);
    return res.status(200).json({ success: true, message: "Name changed successfully" });
})

const deleteChat = tryCatch(async(req, res, next) => {
    const id = req.params.id;

    const chat = await Chat.findById(id);
    if(!chat) return next(new ErrorHandler("Chat not found", 404));

    const members = chat.members;

    if(chat.groupChat && chat.creator.toString() !== req.user.toString()) {
        return next(new ErrorHandler("You are not allowed to edit", 403));
    }
    if(!chat.groupChat && !members.includes(req.user.toString())) 
        return next(new ErrorHandler("You are not allowed to edit", 403));

    const messagesWithAttachments = await Message.find({
        chat: id,
        attachments: {  $exists: true, $ne: [] },
    })

    const public_ids = [];

    messagesWithAttachments.forEach(({ attachments }) => {
        attachments.forEach(({ public_id }) => public_ids.push(public_id))
    });
    
    await Promise.all([
        deleteFilesFromCloudinary(public_ids),
        chat.deleteOne(),
        Message.deleteMany({ chat: id }),
    ])

    emitEvent(req, REFETCH_CHATS, members);
    return res.status(200).json({ success: true, message: "Chat deleted successfully" });
})

const getMessages = tryCatch(async(req, res, next) => {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found", 404));
    if(!chat.members.includes(req.user.toString())) 
        return next(new ErrorHandler("You are not allowed to access", 403));

    const { page = 1 } = req.query;

    const resultPerPage = 20;
    const skip = (page-1)*resultPerPage;

    const [messages, totalMessagesCount] = await Promise.all([
        Message.find({ chat: chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(resultPerPage)
            .populate("sender", "name")
            .lean(),
        Message.countDocuments({ chat: chatId })
    ])

    const totalPages = Math.ceil(totalMessagesCount / resultPerPage);

    return res.status(200).json({ success: true, messages: messages.reverse(), totalPages })
})

export { 
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
};