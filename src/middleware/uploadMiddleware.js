import multer from "multer";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import sharp from "sharp";
import { nanoid } from "nanoid";

export const createUploader = ({ folder, allowedMimeTypes = [], maxSize = 5 * 1024 * 1024 }) => {
  const storagePath = `storage/${folder}`;

  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: { fileSize: maxSize },

    fileFilter: async (req, file, cb) => {
      try {
        if (allowedMimeTypes.length && !allowedMimeTypes.includes(file.mimetype)) {
          return cb(new Error(`File type not allowed: ${file.mimetype}`));
        }

        cb(null, true);
      } catch (error) {
        cb(error);
      }
    },
  });
};

export const processUploadedFiles = (folder) => {
  return async (req, res, next) => {
    try {
      const files = [];

      if (req.file) files.push(req.file);

      if (req.files) {
        if (Array.isArray(req.files)) {
          files.push(...req.files);
        } else {
          Object.values(req.files).forEach((group) => {
            files.push(...group);
          });
        }
      }

      for (const file of files) {
        const isImage = file.mimetype.startsWith("image/");

        const filename = `${Date.now()}-${nanoid(8)}-${file.fieldname}`;

        const filepath = path.join(`storage/${folder}`, filename);

        let finalFilename = filename;

        if (isImage) {
          finalFilename = `${filename}.webp`;
          const finalFilepath = path.join(`storage/${folder}`, finalFilename);

          await sharp(file.buffer).webp({ quality: 80 }).toFile(finalFilepath);

          file.mimetype = "image/webp";
          file.path = finalFilepath;
        } else {
          await fsPromises.writeFile(filepath, file.buffer);
          file.path = filepath;
        }

        file.filename = finalFilename;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const createRawUploader = ({ getDestination, allowedMimeTypes = [], maxSize = 50 * 1024 * 1024 }) => {
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const destination = typeof getDestination === "function" ? getDestination(req, file) : getDestination;

        if (!destination) {
          return cb(new Error("Upload destination is required"));
        }

        await fsPromises.mkdir(destination, {
          recursive: true,
        });

        cb(null, destination);
      } catch (error) {
        cb(error);
      }
    },

    filename: (req, file, cb) => {
      try {
        const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}-${safeName}`);
      } catch (error) {
        cb(error);
      }
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: maxSize,
    },

    fileFilter: (req, file, cb) => {
      try {
        if (allowedMimeTypes.length && !allowedMimeTypes.includes(file.mimetype)) {
          return cb(new Error(`File type not allowed: ${file.mimetype}`));
        }

        cb(null, true);
      } catch (error) {
        cb(error);
      }
    },
  });
};
