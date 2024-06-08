import mongoose, { Schema, model, Types } from 'mongoose';
const schema = new Schema(
    {
        status: {
            type: String,
            default: "pending",
            enum: ["pending", "accepted", "rejected"],
            // the enum option is used to specify that a field's value must be one of a predefined set of values.
            // This is useful for fields that should only take on specific values, such as status fields.
        },
        sender: {
            type: Types.ObjectId,
            ref: "User",        
            required: true,  
        },
        reciever: {
            type: Types.ObjectId,
            ref: "User",       
            required: true,  
        },
    },
    {
        timestamps: true,
    }
);

export const Request = mongoose.models.Request || model("Request", schema);