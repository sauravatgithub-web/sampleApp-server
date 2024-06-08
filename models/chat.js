import mongoose, { Schema, model, Types } from 'mongoose';
const schema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        groupChat: {
            type: Boolean,
            default: false,
        },
        creator: {
            type: Types.ObjectId,
            ref: "User",          // a document in user collection will be referenced for object id
        },
        members: [  // it will be an array
            {
                type: Types.ObjectId,
                ref: "User",
            }
        ]
    },
    {
        timestamps: true,
    }
);

export const Chat = mongoose.models.Chat || model("Chat", schema);