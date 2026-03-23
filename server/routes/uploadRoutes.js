import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { uploadProjectFile } from '../controllers/uploadController.js';

const router = express.Router();

router.post('/project', protect, upload.single('file'), uploadProjectFile);

export default router;
