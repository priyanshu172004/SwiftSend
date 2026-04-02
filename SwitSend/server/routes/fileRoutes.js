import express from 'express';
import {
  uploadFile,
  createFolder,
  listFiles,
  getFile,
  getFolderContents,
  deleteFile,
  renameFile,
  shareWithUsers,
  removeShare,
  togglePublicShare,
  accessPublicFile,
  downloadFile
} from '../controllers/fileController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  validate,
  createFolderSchema,
  updateFileSchema,
  shareWithUsersSchema,
  publicShareSchema
} from '../validations/fileValidation.js';

const router = express.Router();

// Public routes
router.get('/public/:token', accessPublicFile);

// Protected routes
router.use(authenticate);

// File operations
router.post('/upload', upload.single('file'), uploadFile);
router.post('/folder', validate(createFolderSchema), createFolder);
router.get('/', listFiles);
router.get('/download/:id', downloadFile);
router.get('/:id', getFile);
router.get('/:id/contents', getFolderContents);
router.delete('/:id', deleteFile);
router.patch('/:id', validate(updateFileSchema), renameFile);

// Sharing operations - Priyanshu
router.post('/:id/share', validate(shareWithUsersSchema), shareWithUsers);
router.delete('/:id/share/:userId', removeShare);
router.post('/:id/public', validate(publicShareSchema), togglePublicShare);

export default router;
