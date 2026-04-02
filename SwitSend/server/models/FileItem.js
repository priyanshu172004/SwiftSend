import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const FileItem = sequelize.define('FileItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.ENUM('file', 'folder'),
    allowNull: false,
    defaultValue: 'file'
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'file_items',
      key: 'id'
    }
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  path: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: true,
    defaultValue: 0
  },
  storageKey: {
    type: DataTypes.STRING,
    allowNull: true
  },
  storageType: {
    type: DataTypes.ENUM('local', 'cloudinary'),
    defaultValue: 'local'
  },
  localPath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  shareToken: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  }
}, {
  tableName: 'file_items',
  timestamps: true,
  hooks: {
    beforeCreate: async (fileItem) => {
      if (fileItem.type === 'file' && !fileItem.shareToken) {
        fileItem.shareToken = uuidv4();
      }
    }
  }
});

export default FileItem;
