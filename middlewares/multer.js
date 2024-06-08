import multer from 'multer';

const multerUpload = multer({
    limits: {
        fileSize: 1024 * 1024 * 5,
    }
});

const attachmentsMulter = multerUpload.array("files", 10);
const singleAvatar = multerUpload.single("avatar");

export { attachmentsMulter, singleAvatar };