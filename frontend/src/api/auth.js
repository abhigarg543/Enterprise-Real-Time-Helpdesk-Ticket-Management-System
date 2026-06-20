import axios from 'axios';

const API_URL = '/api/auth/';

export const login = async (email, password) => {
  const response = await axios.post(API_URL + 'signin', { email, password });
  if (response.data.token) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('user');
};

export const register = async (fullName, email, password) => {
  return axios.post(API_URL + 'signup', {
    fullName,
    email,
    password
  });
};

export const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('user'));
};
