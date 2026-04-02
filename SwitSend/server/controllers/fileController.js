import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { FileItem, FileShare, User } from '../models/index.js';
import { uploadToCloudinary, deleteLocalFile } from '../middleware/uploadMiddleware.js';
import { Op } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to build full path for a file/folder
const buildPath = async (fileItem) => {
  if (!fileItem.parentId) {
    return fileItem.name;
  }

  const parent = await FileItem.findByPk(fileItem.parentId);
  if (!parent) {
    return fileItem.name;
  }

  const parentPath = await buildPath(parent);
  return `${parentPath}/${fileItem.name}`;
};

// Helper to check access permission
const checkAccess = async (userId, fileItemId) => {
  const fileItem = await FileItem.findByPk(fileItemId);

  if (!fileItem) {
    return { access: false, fileItem: null, reason: 'not_found' };
  }

  // Owner has full access
  if (fileItem.ownerId === userId) {
    return { access: true, fileItem, level: 'owner' };
  }

  // Check if shared directly with user
  const share = await FileShare.findOne({
    where: {
      fileItemId,
      userId
    }
  });

  if (share) {
    return { access: true, fileItem, level: share.permission };
  }

  // Check if user has access through parent folder chain
  let parentId = fileItem.parentId;
  while (parentId) {
    const parentItem = await FileItem.findByPk(parentId);
    if (!parentItem) break;

    // If user owns the parent folder, they can access this item
    if (parentItem.ownerId === userId) {
      return { access: true, fileItem, level: 'inherited' };
    }

    // If parent is shared with user, they can access this item
    const parentShare = await FileShare.findOne({
      where: {
        fileItemId: parentId,
        userId
      }
    });
    if (parentShare) {
      return { access: true, fileItem, level: parentShare.permission };
    }

    parentId = parentItem.parentId;
  }

  // Check if it's a public item
  if (fileItem.isPublic) {
    return { access: true, fileItem, level: 'public' };
  }

  return { access: false, fileItem, reason: 'no_permission' };
};

// Upload file
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { parentId } = req.body;
    const parentIdNum = parentId ? parseInt(parentId) : null;

    // Validate parent folder exists if provided
    if (parentIdNum) {
      const parentFolder = await FileItem.findOne({
        where: { id: parentIdNum, type: 'folder' }
      });

      if (!parentFolder) {
        deleteLocalFile(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Parent folder not found'
        });
      }

      // Check if user has access to parent
      const access = await checkAccess(req.user.id, parentIdNum);
      if (!access.access || access.level === 'read') {
        deleteLocalFile(req.file.path);
        return res.status(403).json({
          success: false,
          message: 'No permission to upload to this folder'
        });
      }
    }

    const storageType = process.env.STORAGE_TYPE === 'cloudinary' ? 'cloudinary' : 'local';
    let storageKey = null;
    let localPath = req.file.path;

    // Upload to Cloudinary if configured
    if (storageType === 'cloudinary') {
      try {
        const cloudResult = await uploadToCloudinary(req.file.path);
        storageKey = cloudResult.secure_url;
        // Delete local file after uploading to cloud
        deleteLocalFile(req.file.path);
        localPath = null;
      } catch (cloudError) {
        console.error('Cloudinary upload failed, using local storage:', cloudError);
      }
    }

    const fileItem = await FileItem.create({
      name: req.file.originalname,
      type: 'file',
      parentId: parentIdNum,
      ownerId: req.user.id,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storageKey,
      storageType: storageKey ? 'cloudinary' : 'local',
      localPath
    });

    // Build full path
    fileItem.path = await buildPath(fileItem);
    await fileItem.save();

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: { file: fileItem }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      deleteLocalFile(req.file.path);
    }
    next(error);
  }
};

// Create folder
export const createFolder = async (req, res, next) => {
  try {
    const { name, parentId } = req.body;
    const parentIdNum = parentId ? parseInt(parentId) : null;

    // Validate parent folder exists if provided
    if (parentIdNum) {
      const parentFolder = await FileItem.findOne({
        where: { id: parentIdNum, type: 'folder' }
      });

      if (!parentFolder) {
        return res.status(400).json({
          success: false,
          message: 'Parent folder not found'
        });
      }

      // Check if user has write access to parent
      const access = await checkAccess(req.user.id, parentIdNum);
      if (!access.access || access.level === 'read') {
        return res.status(403).json({
          success: false,
          message: 'No permission to create folder here'
        });
      }
    }

    // Check if folder with same name exists in parent
    const existingFolder = await FileItem.findOne({
      where: {
        name,
        parentId: parentIdNum,
        type: 'folder',
        ownerId: req.user.id
      }
    });

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        message: 'Folder with this name already exists'
      });
    }

    const folder = await FileItem.create({
      name,
      type: 'folder',
      parentId: parentIdNum,
      ownerId: req.user.id,
      size: 0
    });

    // Build full path
    folder.path = await buildPath(folder);
    await folder.save();

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: { folder }
    });
  } catch (error) {
    next(error);
  }
};

// List files/folders (root or by parent)
export const listFiles = async (req, res, next) => {
  try {
    const { parentId } = req.query;
    const parentIdNum = parentId ? parseInt(parentId) : null;

    // First, check if user has access to the parent folder (if specified)
    // Use checkAccess which properly handles: owner, shared, and public
    if (parentIdNum) {
      const parentAccess = await checkAccess(req.user.id, parentIdNum);
      if (!parentAccess.access) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
      }

      // User is viewing a shared folder - show ALL contents inside it
      // (owned by the folder owner)
      const folderOwnerId = parentAccess.fileItem.ownerId;

      const allItemsInSharedFolder = await FileItem.findAll({
        where: {
          parentId: parentIdNum,
          ownerId: folderOwnerId
        },
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [
          ['type', 'DESC'],
          ['name', 'ASC']
        ]
      });

      const itemsWithShareInfo = allItemsInSharedFolder.map(item => ({
        ...item.toJSON(),
        shared: true, // These are inside a shared folder
        permission: parentAccess.level
      }));

      return res.json({
        success: true,
        data: { files: itemsWithShareInfo }
      });
    }

    // Root level - show owned items + directly shared items
    // Get items owned by the user
    const ownedItems = await FileItem.findAll({
      where: {
        ownerId: req.user.id,
        parentId: parentIdNum
      },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [
        ['type', 'DESC'], // folders first
        ['name', 'ASC']
      ]
    });

    // Get items shared with the user (excluding public items - they only show via public link)
    const sharedItems = await FileShare.findAll({
      where: { userId: req.user.id },
      include: [{
        model: FileItem,
        as: 'fileItem',
        where: { parentId: parentIdNum },
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }]
      }]
    });

    // Map shared items
    const sharedFiles = sharedItems.map(share => ({
      ...share.fileItem.toJSON(),
      shared: true,
      permission: share.permission
    }));

    // Combine owned and shared items
    const ownedFileIds = new Set(ownedItems.map(f => f.id));
    const uniqueSharedFiles = sharedFiles.filter(f => !ownedFileIds.has(f.id));

    // Add shared flag to owned items
    const ownedWithShareInfo = ownedItems.map(item => ({
      ...item.toJSON(),
      shared: false,
      permission: null
    }));

    const allItems = [...ownedWithShareInfo, ...uniqueSharedFiles];

    res.json({
      success: true,
      data: { files: allItems }
    });
  } catch (error) {
    next(error);
  }
};

// Get file/folder details
export const getFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fileId = parseInt(id);

    const { access, fileItem } = await checkAccess(req.user.id, fileId);

    if (!access) {
      // Don't reveal whether file exists - just say not found for security
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Get shares for this file
    const shares = await FileShare.findAll({
      where: { fileItemId: fileId },
      include: [{
        model: User,
        as: 'sharedWithUser',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.json({
      success: true,
      data: {
        file: {
          ...fileItem.toJSON(),
          shares: shares.map(s => s.sharedWithUser)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get folder contents
export const getFolderContents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fileId = parseInt(id);

    const { access, fileItem, reason } = await checkAccess(req.user.id, fileId);

    if (!access) {
      return res.status(403).json({
        success: false,
        message: reason === 'not_found' ? 'Folder not found' : 'No permission to access this folder'
      });
    }

    if (fileItem.type !== 'folder') {
      return res.status(400).json({
        success: false,
        message: 'Not a folder'
      });
    }

    // Get direct children
    const children = await FileItem.findAll({
      where: { parentId: fileId },
      include: [{
        model: User,
        as: 'owner',
        attributes: ['id', 'name', 'email']
      }],
      order: [
        ['type', 'DESC'],
        ['name', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: { contents: children }
    });
  } catch (error) {
    next(error);
  }
};

// Delete file/folder
export const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fileId = parseInt(id);

    const { access, fileItem, reason } = await checkAccess(req.user.id, fileId);

    if (!access) {
      return res.status(403).json({
        success: false,
        message: reason === 'not_found' ? 'File not found' : 'No permission to delete this file'
      });
    }

    // Only owner can delete
    if (fileItem.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only owner can delete this file'
      });
    }

    // If folder, recursively delete all children
    const deleteRecursive = async (itemId) => {
      const children = await FileItem.findAll({ where: { parentId: itemId } });

      for (const child of children) {
        if (child.type === 'folder') {
          await deleteRecursive(child.id);
        } else {
          // Delete file storage
          if (child.localPath) {
            deleteLocalFile(child.localPath);
          }
          await child.destroy();
        }
      }

      const parentItem = await FileItem.findByPk(itemId);
      if (parentItem) {
        if (parentItem.localPath) {
          deleteLocalFile(parentItem.localPath);
        }
        await parentItem.destroy();
      }
    };

    await deleteRecursive(fileId);

    // Delete associated shares
    await FileShare.destroy({ where: { fileItemId: fileId } });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Rename file/folder
export const renameFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const fileId = parseInt(id);

    const { access, fileItem, reason } = await checkAccess(req.user.id, fileId);

    if (!access) {
      return res.status(403).json({
        success: false,
        message: reason === 'not_found' ? 'File not found' : 'No permission to rename this file'
      });
    }

    // Only owner can rename
    if (fileItem.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only owner can rename this file'
      });
    }

    fileItem.name = name;
    fileItem.path = await buildPath(fileItem);
    await fileItem.save();

    res.json({
      success: true,
      message: 'File renamed successfully',
      data: { file: fileItem }
    });
  } catch (error) {
    next(error);
  }
};

// Share with specific users
export const shareWithUsers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userIds, permission } = req.body;
    const fileId = parseInt(id);

    const fileItem = await FileItem.findByPk(fileId);

    if (!fileItem) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Only owner can share
    if (fileItem.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only owner can share this file'
      });
    }

    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } }
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more users not found'
      });
    }

    // Create shares
    const shares = [];
    for (const userId of userIds) {
      const existingShare = await FileShare.findOne({
        where: { fileItemId: fileId, userId }
      });

      if (existingShare) {
        existingShare.permission = permission;
        await existingShare.save();
        shares.push(existingShare);
      } else {
        const share = await FileShare.create({
          fileItemId: fileId,
          userId,
          permission,
          sharedById: req.user.id
        });
        shares.push(share);
      }
    }

    res.json({
      success: true,
      message: 'File shared successfully',
      data: { shares }
    });
  } catch (error) {
    next(error);
  }
};

// Remove share for a user
export const removeShare = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const fileId = parseInt(id);
    const targetUserId = parseInt(userId);

    const fileItem = await FileItem.findByPk(fileId);

    if (!fileItem) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Only owner can remove shares
    if (fileItem.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only owner can remove shares'
      });
    }

    await FileShare.destroy({
      where: { fileItemId: fileId, userId: targetUserId }
    });

    res.json({
      success: true,
      message: 'Share removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Toggle public sharing
export const togglePublicShare = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    const fileId = parseInt(id);

    const { access, fileItem, reason } = await checkAccess(req.user.id, fileId);

    if (!access) {
      return res.status(403).json({
        success: false,
        message: reason === 'not_found' ? 'File not found' : 'No permission to modify this file'
      });
    }

    // Only owner can make public
    if (fileItem.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only owner can change public sharing settings'
      });
    }

    fileItem.isPublic = isPublic;
    if (isPublic && !fileItem.shareToken) {
      fileItem.shareToken = uuidv4();
    }
    await fileItem.save();

    res.json({
      success: true,
      message: isPublic ? 'File is now public' : 'File is no longer public',
      data: {
        file: {
          id: fileItem.id,
          isPublic: fileItem.isPublic,
          shareToken: fileItem.shareToken
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Access file via public link
export const accessPublicFile = async (req, res, next) => {
  try {
    const { token } = req.params;

    const fileItem = await FileItem.findOne({
      where: { shareToken: token, isPublic: true }
    });

    if (!fileItem) {
      return res.status(404).json({
        success: false,
        message: 'Public file not found or not shared'
      });
    }

    if (fileItem.type === 'folder') {
      // For folders, return metadata
      return res.json({
        success: true,
        data: {
          file: {
            id: fileItem.id,
            name: fileItem.name,
            type: fileItem.type,
            path: fileItem.path,
            isPublic: fileItem.isPublic
          }
        }
      });
    }

    // For files, return download info
    res.json({
      success: true,
      data: {
        file: {
          id: fileItem.id,
          name: fileItem.name,
          type: fileItem.type,
          mimeType: fileItem.mimeType,
          size: fileItem.size,
          path: fileItem.path,
          isPublic: fileItem.isPublic,
          storageType: fileItem.storageType,
          downloadUrl: fileItem.storageType === 'cloudinary'
            ? fileItem.storageKey
            : `/api/files/download/${fileItem.id}`
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Download file
export const downloadFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fileId = parseInt(id);

    const { access, fileItem, reason } = await checkAccess(req.user.id, fileId);

    if (!access) {
      return res.status(403).json({
        success: false,
        message: reason === 'not_found' ? 'File not found' : 'No permission to download this file'
      });
    }

    if (fileItem.type !== 'file') {
      return res.status(400).json({
        success: false,
        message: 'Cannot download a folder'
      });
    }

    if (fileItem.storageType === 'cloudinary') {
      // Redirect to cloudinary URL
      return res.redirect(fileItem.storageKey);
    }

    // Local file download
    if (!fileItem.localPath || !fs.existsSync(fileItem.localPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.download(fileItem.localPath, fileItem.name);
  } catch (error) {
    next(error);
  }
};
