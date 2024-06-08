import { hash } from 'bcrypt';
import mongoose, { Schema, model } from 'mongoose';
const schema = new Schema(
    {   
        bio: {
            type: String,
        },
        name: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
            select: false,   // field will be excluded from query results by defaul
        },
        avatar: {
            public_id: {
                type: String,
                required: true,
            },
            url: {
                type: String,
                required: true,
            }
        }
    },
    {
        timestamps: true,
    }
);

schema.pre("save", async function(next) {
    if(!this.isModified("password")) return next();
    this.password = await hash(this.password, 10);
})

export const User = mongoose.models.User || model("User", schema);
// This approach ensures that the model is either retrieved from the existing models or created if it doesn't 
// already exist.