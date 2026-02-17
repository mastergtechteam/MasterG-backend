
import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/aws.js";
import { v4 as uuid } from "uuid";

export const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.BUCKET_NAME,
    acl: "public-read",
    key: (req, file, cb) => {
      cb(null, `deals/${uuid()}-${file.originalname}`);
    },
  }),
});
