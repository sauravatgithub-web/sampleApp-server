class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

const returnFn = (res, data) => {
    return res.status(200).json({ success: true, ...data});
}

export  { ErrorHandler, returnFn};