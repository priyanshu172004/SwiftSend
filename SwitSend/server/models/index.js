import User from './User.js';
import FileItem from './FileItem.js';
import FileShare from './FileShare.js';

// User - FileItem associations
User.hasMany(FileItem, { foreignKey: 'ownerId', as: 'files' });
FileItem.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// FileItem self-referential (parent-child)
FileItem.hasMany(FileItem, { foreignKey: 'parentId', as: 'children' });
FileItem.belongsTo(FileItem, { foreignKey: 'parentId', as: 'parent' });

// FileItem - FileShare associations
FileItem.hasMany(FileShare, { foreignKey: 'fileItemId', as: 'shares' });
FileShare.belongsTo(FileItem, { foreignKey: 'fileItemId', as: 'fileItem' });

// User - FileShare associations (user shared with)
User.hasMany(FileShare, { foreignKey: 'userId', as: 'sharedWithMe' });
FileShare.belongsTo(User, { foreignKey: 'userId', as: 'sharedWithUser' });

// User - FileShare associations (user who shared)
User.hasMany(FileShare, { foreignKey: 'sharedById', as: 'sharedByMe' });
FileShare.belongsTo(User, { foreignKey: 'sharedById', as: 'sharedByUser' });

export { User, FileItem, FileShare };
