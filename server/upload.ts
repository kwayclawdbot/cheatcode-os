/**
 * Media upload route — POST /api/upload
 * Accepts multipart/form-data with a single "file" field.
 * Uploads to S3 via storagePut and returns the public CDN URL.
 * Max size: 50 MB. Allowed types: images and videos.
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/webm", "video/quicktime",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

export function registerUploadRoute(app: import("express").Application) {
  const router = Router();

  router.post("/", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const { originalname, mimetype, buffer } = req.file;
      const ext = originalname.split(".").pop() || "bin";
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 8);
      const key = `posts/${timestamp}-${random}.${ext}`;

      const { url } = await storagePut(key, buffer, mimetype);
      res.json({ url, key, mimetype });
    } catch (err: any) {
      console.error("[Upload] Error:", err);
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  app.use("/api/upload", router);
}
