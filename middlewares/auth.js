import { adminSecretKey } from "../app.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";

const isAuthenticated = (req, res, next) => {
    const token = req.cookies['app-token'];
    if(!token) {
        return next(new ErrorHandler("Please login to access this route", 401));
    }
    else {
        const decodedData = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedData._id;
    }
    next();
};

const isAdmin = (req, res, next) => {
    const token = req.cookies['app-admin-token'];
    if(!token) {
        return next(new ErrorHandler("Only admin can access", 401));
    }
    else {
        const secretKey = jwt.verify(token, process.env.JWT_SECRET);
        const isMatched = secretKey === adminSecretKey;
        if(!isMatched) return next(new ErrorHandler("Invalid Admin Key", 401));
    }
    next();
};

const socketAuthenticator = async(err, socket, next) => {
    try {
        if(err) return next(err);
        const authToken = socket.request.cookies['app-token'];

        if(!authToken) return next(new ErrorHandler("Please login to access this route", 401));

        const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);
        const user = await User.findById(decodedData._id);
        if(!user) return next(new ErrorHandler("Please login to access this route", 401));

        socket.user = user;
        return next();
    }
    catch(error) {
        console.log(error);
        return next(new ErrorHandler("Please login to access this route", 401));
    }
}

export { isAuthenticated, isAdmin, socketAuthenticator };