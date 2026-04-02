import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { filesAPI, usersAPI } from '../services/api';

const Dashboard = () => {
  const { folderId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [shareSearch, setShareSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [searching, setSearching] = useState(false);

  const currentFolderId = folderId ? parseInt(folderId) : null;

  useEffect(() => {
    fetchFiles();
    if (currentFolderId) {
      fetchBreadcrumbs(currentFolderId);
    } else {
      setBreadcrumbs([]);
    }
  }, [currentFolderId]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await filesAPI.list(currentFolderId);
      setFiles(response.data.data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchBreadcrumbs = async (id) => {
    const crumbs = [];
    let currentId = id;
    while (currentId) {
      try {
        const response = await filesAPI.get(currentId);
        const file = response.data.data.file;
        crumbs.unshift({ id: file.id, name: file.name });
        currentId = file.parentId;
      } catch {
        break;
      }
    }
    setBreadcrumbs(crumbs);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await filesAPI.upload(file, currentFolderId);
      setShowUploadModal(false);
      fetchFiles();
    } catch (error) {
      alert(error.response?.data?.message || 'Upload failed');
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await filesAPI.createFolder(newFolderName, currentFolderId);
      setShowFolderModal(false);
      setNewFolderName('');
      fetchFiles();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create folder');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      await filesAPI.delete(id);
      fetchFiles();
    } catch (error) {
      alert(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleRename = async (id) => {
    const newName = prompt('Enter new name:');
    if (!newName) return;
    try {
      await filesAPI.rename(id, newName);
      fetchFiles();
    } catch (error) {
      alert(error.response?.data?.message || 'Rename failed');
    }
  };

  const handleDownload = (file) => {
    window.open(filesAPI.download(file.id), '_blank');
  };

  const handleShare = async (file) => {
    try {
      const response = await filesAPI.get(file.id);
      setSelectedFile(response.data.data.file);
      setSharedUsers(response.data.data.file.shares || []);
    } catch (error) {
      alert(error.response?.data?.message || 'Cannot access this file');
      return;
    }
    setShowShareModal(true);
    setShareSearch('');
    setSearchResults([]);
  };

  const handleSearchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await usersAPI.search(query);
      setSearchResults(response.data.data.users || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleShareWithUser = async (userId) => {
    if (!selectedFile) return;
    try {
      await filesAPI.share(selectedFile.id, [userId], 'read');
      const response = await filesAPI.get(selectedFile.id);
      setSharedUsers(response.data.data.file.shares || []);
      setShareSearch('');
      setSearchResults([]);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to share');
    }
  };

  const handleRemoveShare = async (userId) => {
    if (!selectedFile) return;
    try {
      await filesAPI.removeShare(selectedFile.id, userId);
      const response = await filesAPI.get(selectedFile.id);
      setSharedUsers(response.data.data.file.shares || []);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to remove share');
    }
  };

  const handleTogglePublic = async (isPublic) => {
    if (!selectedFile) return;
    try {
      await filesAPI.togglePublic(selectedFile.id, isPublic);
      setShowShareModal(false);
      fetchFiles();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update sharing');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">File Sharing Platform</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/dashboard" className="text-purple-600 hover:underline">Home</Link>
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.id} className="flex items-center gap-2">
              <span className="text-gray-400">/</span>
              {index === breadcrumbs.length - 1 ? (
                <span className="text-gray-800">{crumb.name}</span>
              ) : (
                <Link to={`/dashboard/folder/${crumb.id}`} className="text-purple-600 hover:underline">
                  {crumb.name}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Actions */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex gap-3">
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Upload File
        </button>
        <button
          onClick={() => setShowFolderModal(true)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          New Folder
        </button>
      </div>

      {/* File List */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No files or folders</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => file.type === 'folder' ? navigate(`/dashboard/folder/${file.id}`) : handleDownload(file)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      {file.type === 'folder' ? (
                        <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {file.type === 'file' ? formatSize(file.size) : 'Folder'}
                        {file.isPublic && <span className="ml-2 text-green-600">Public</span>}
                        {file.shared && <span className="ml-2 text-blue-600">Shared</span>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => handleShare(file)}
                      className="p-1 text-gray-400 hover:text-purple-600"
                      title="Share"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRename(file.id)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Rename"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Upload File</h3>
            <input
              type="file"
              onChange={handleUpload}
              className="w-full border rounded p-2"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Create New Folder</h3>
            <form onSubmit={handleCreateFolder}>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full border rounded p-2 mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowFolderModal(false); setNewFolderName(''); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Share "{selectedFile.name}"</h3>

            {/* Share with Users */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share with users
              </label>
              <input
                type="text"
                value={shareSearch}
                onChange={(e) => {
                  setShareSearch(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
                placeholder="Search by email or name..."
                className="w-full border rounded-md p-2 text-sm"
              />
              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-md max-h-32 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleShareWithUser(user.id)}
                      className="p-2 hover:bg-gray-50 cursor-pointer text-sm"
                    >
                      <p className="font-medium">{user.name}</p>
                      <p className="text-gray-500 text-xs">{user.email}</p>
                    </div>
                  ))}
                </div>
              )}
              {searching && <p className="text-sm text-gray-500 mt-1">Searching...</p>}
            </div>

            {/* Shared Users List */}
            {sharedUsers.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shared with
                </label>
                <div className="space-y-2">
                  {sharedUsers.map((sharedUser) => (
                    <div
                      key={sharedUser.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="text-sm font-medium">{sharedUser.name}</p>
                        <p className="text-xs text-gray-500">{sharedUser.email}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveShare(sharedUser.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Public Link Toggle */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Public Link</span>
                <button
                  onClick={() => handleTogglePublic(!selectedFile.isPublic)}
                  className={`px-3 py-1 rounded text-sm ${selectedFile.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}
                >
                  {selectedFile.isPublic ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {selectedFile.isPublic && selectedFile.shareToken && (
                <div className="p-3 bg-blue-50 rounded mt-2">
                  <p className="text-sm text-gray-600 mb-1">Share Link:</p>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/public/${selectedFile.shareToken}`}
                    className="w-full text-sm bg-white border rounded p-2"
                    onClick={(e) => e.target.select()}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => { setShowShareModal(false); setSelectedFile(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
