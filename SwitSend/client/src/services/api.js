import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:2100';

const API_URL = `${baseURL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Files API
export const filesAPI = {
  list: (parentId) => api.get('/files', { params: { parentId } }),
  upload: (file, parentId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (parentId) formData.append('parentId', parentId);
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  createFolder: (name, parentId) =>
    api.post('/files/folder', { name, parentId }),
  get: (id) => api.get(`/files/${id}`),
  getContents: (id) => api.get(`/files/${id}/contents`),
  delete: (id) => api.delete(`/files/${id}`),
  rename: (id, name) => api.patch(`/files/${id}`, { name }),
  download: (id) => `${API_URL}/files/download/${id}`,
  share: (id, userIds, permission) =>
    api.post(`/files/${id}/share`, { userIds, permission }),
  removeShare: (id, userId) => api.delete(`/files/${id}/share/${userId}`),
  togglePublic: (id, isPublic) =>
    api.post(`/files/${id}/public`, { isPublic }),
  getPublicFile: (token) => api.get(`/files/public/${token}`),
};

// Users API
export const usersAPI = {
  search: (query) => api.get('/users/search', { params: { q: query } }),
};

export default api;
