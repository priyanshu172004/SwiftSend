import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FileShare = sequelize.define('FileShare', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fileItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'file_items',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  permission: {
    type: DataTypes.ENUM('read'),
    defaultValue: 'read'
  },
  sharedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'file_shares',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['fileItemId', 'userId']
    }
  ]
});

export default FileShare;
