import multer from "multer";
import path from "path";
import fs from "fs";

export const createUploader = ({
  folder,
  allowedMimeTypes = [],
  maxSize = 2 * 1024 * 1024,
}) => {
  const storagePath = `storage/${folder}`;

  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, storagePath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${file.fieldname}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter: (req, file, cb) => {
      if (
        allowedMimeTypes.length &&
        !allowedMimeTypes.includes(file.mimetype)
      ) {
        return cb(new Error(`File type not allowed: ${file.mimetype}`));
      }
      cb(null, true);
    },
  });
};
