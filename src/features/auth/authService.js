import axiosClient from '../../apis/axiosClient';

const API_URL = '/api/auth';

// Register user
const register = async (userData) => {
  const response = await axiosClient.post(`${API_URL}/register`, userData);
  if (response?.token) {
    // Gom token vào chung với user data và loại bỏ 'message' để lưu vào localStorage
    const userDataToSave = { ...response.user, token: response.token };
    localStorage.setItem('user', JSON.stringify(userDataToSave));
    return userDataToSave;
  }
  return response;
};

// Login user
const login = async (userData) => {
  const response = await axiosClient.post(`${API_URL}/login`, userData);
  if (response?.token) {
    const userDataToSave = { ...response.user, token: response.token };
    localStorage.setItem('user', JSON.stringify(userDataToSave));
    return userDataToSave;
  }
  return response;
};

// Logout user
const logout = () => {
  localStorage.removeItem('user');
};

// Get current user (getMe)
const getMe = async () => {
  const response = await axiosClient.get(`${API_URL}/me`);
  if (response?.user) {
    const oldUser = JSON.parse(localStorage.getItem('user')) || {};
    const userDataToSave = { ...oldUser, ...response.user };
    localStorage.setItem('user', JSON.stringify(userDataToSave));
    return userDataToSave;
  }
  return response;
};

const authService = {
  register,
  login,
  logout,
  getMe,
};

export default authService;
