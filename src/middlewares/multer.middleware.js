//Multer is a middleware for handling multipart/form-data in Node.js. It is used primarily for uploading files.
// When you want to allow users to upload files (like images, documents, etc.) to your server, 
// Multer is the tool you use to manage and process those files. It helps with handling the file upload process,
// including storing files, setting file limits, and validating file types.

import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp"); // null indicates there is no error and you can proceed with the uploading file at the given file location i.e /public/temp
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

export const upload = multer({
  storage,
});
