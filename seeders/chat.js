import { faker, simpleFaker } from '@faker-js/faker'
import { User } from '../models/user.js';
import { Chat } from '../models/chat.js';
import { Message } from '../models/message.js';

const createSingleChats = async () => {
    try {
        const users = await User.find().select("_id");
        const chatsPromise = [];

        for(let i = 0; i < users.length; i++) {
            for(let j = i+1; j < users.length; j++) {
                chatsPromise.push(
                    Chat.create({
                        name: faker.lorem.words(2),
                        members: [users[i], users[j]]
                    })
                )
            }
        }

        await Promise.all(chatsPromise);

        console.log("Creation successfull.");
        process.exit();
    }
    catch(error) {
        console.error(error);
        process.exit(1);
    }
}

const createGroupChats = async(num) => {
    try {
        const users = await User.find().select("_id");
        const chatsPromise = [];

        for(let i = 0; i < num; i++) {
            const numMembers = simpleFaker.number.int({ min: 3, max: users.length })
            const members = [];

            for(let j = 0; j < numMembers; j++) {
                const randomIndex = Math.floor(Math.random() * users.length);
                const randomUser = users[randomIndex]

                if(!members.includes(randomUser)) {
                    members.push(randomUser);
                }
            }

            const chat = Chat.create({
                groupChat: true,
                name: faker.lorem.words(1),
                members,
                creator: members[0]
            })

            chatsPromise.push(chat);
        }

        await Promise.all(chatsPromise);

        console.log("Creation successfull.");
        process.exit();
    }
    catch(error) {
        console.error(error);
        process.exit(1);
    }
}

const createMessages = async(numMessages) => {
    try {
        const users = await User.find().select("_id");
        const chats = await Chat.find().select("_id");
        const messagesPromise = [];

        for(let i = 0; i < numMessages; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomChat = chats[Math.floor(Math.random() * users.length)];

            messagesPromise.push(
                Message.create({
                    chat: randomChat,
                    sender: randomUser,
                    content: faker.lorem.sentence()
                })
            )
        }

        await Promise.all(chatsPromise);

        console.log("Creation successfull.");
        process.exit();
    }
    catch(error) {
        console.error(error);
        process.exit(1);
    }
}

const createMessagesInAChat = async(chatId, numMessages) => {
    try {
        const users = await User.find().select("_id");
        const messagesPromise = [];

        for(let i = 0; i < numMessages; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];

            messagesPromise.push(
                Message.create({
                    chat: chatId,
                    sender: randomUser,
                    content: faker.lorem.sentence()
                })
            )
        }

        await Promise.all(messagesPromise);

        console.log("Creation successfull.");
        process.exit();
    }
    catch(error) {
        console.error(error);
        process.exit(1);
    }
}

export { createGroupChats, createMessages, createMessagesInAChat, createSingleChats };