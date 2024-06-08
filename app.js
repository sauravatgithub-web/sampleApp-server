import express from "express";
import http from "http";
import userRoute from './routes/user.js';
import chatRoute from './routes/chat.js';
import adminRoute from './routes/admin.js';
import { connectDB } from './utils/features.js';
import dotenv from 'dotenv';
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from 'cookie-parser';
import { Server } from "socket.io";
import { ALERT, CHAT_JOINED, CHAT_LEAVED, NEW_MESSAGE, NEW_MESSAGE_ALERT, NEW_REQUEST, ONLINE_USERS, REFETCH_CHATS, START_TYPING, STOP_TYPING } from "./constants/events.js";
import { v4 as uuid } from 'uuid';
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.js";
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";

dotenv.config({
    path: "./.env",
});
const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
export const envMode = process.env.NODE_ENV.trim() ||"PRODUCTION";
export const adminSecretKey = process.env.ADMIN_SECRET_KEY || "riemannIntegration";
export const userSocketIDs = new Map();
export const onlineUsers = new Set();

connectDB(mongoURI);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions
});

app.set('io', io);

// using middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use('/api/v1/user', userRoute); // we are adding prefix to the route
app.use('/api/v1/chat', chatRoute);
app.use('/api/v1/admin', adminRoute);

app.get("/", (req, res) => {
    res.send("I am rocker");
})

io.use((socket, next) => {
    cookieParser()(socket.request, socket.request.res, 
        async(err) => await socketAuthenticator(err, socket, next)
    );
})

io.on("connection", (socket) => {
    const user = socket.user;
    if(user && user._id) userSocketIDs.set(user._id.toString(), socket.id);
    socket.on(NEW_MESSAGE, async({ chatId, members, message }) => {
        const messageForRealTime = {
            content: message,
            _id: uuid(),
            sender: {
                _id: user._id,
                name: user.name,
            },
            chat: chatId,
            createdAt: new Date().toISOString()
        }
        const messageForDB = {
            content: message,
            sender: user._id,
            chat: chatId,
        }

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(NEW_MESSAGE, {
            chatId,
            message: messageForRealTime, 
        })
        io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

        try {await Message.create(messageForDB)} catch(error) { console.log(error) };
    })

    socket.on(START_TYPING, ({ members, chatId }) => {
        const membersSocket = getSockets(members);
        socket.to(membersSocket).emit(START_TYPING, { chatId })
    })

    socket.on(STOP_TYPING, ({ members, chatId }) => {
        const membersSocket = getSockets(members);
        socket.to(membersSocket).emit(STOP_TYPING, { chatId })
    })

    socket.on(NEW_REQUEST, ({ members, chatId }) => {
        const membersSocket = getSockets(members);
        socket.to(membersSocket).emit(NEW_REQUEST, { chatId })
    })

    socket.on(ALERT, ({ members, chatId }) => {
        const membersSocket = getSockets(members);
        socket.to(membersSocket).emit(ALERT, { chatId })
    })

    socket.on(REFETCH_CHATS, ({ members, chatId }) => {
        const membersSocket = getSockets(members);
        socket.to(membersSocket).emit(REFETCH_CHATS, { chatId })
    })

    socket.on(CHAT_JOINED, ({ userId, members }) => {
        onlineUsers.add(userId.toString());
        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    })

    socket.on(CHAT_LEAVED, ({ userId, members }) => {
        onlineUsers.delete(userId.toString());
        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    })
    
    socket.on("disconnect", () => {
        userSocketIDs.delete(user._id.toString());
        onlineUsers.delete(user._id.toString());
        socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
    })
})

app.use(errorMiddleware)

server.listen(port, () => {
    console.log(`Server is listening at port ${port} in ${envMode} mode`);
})

