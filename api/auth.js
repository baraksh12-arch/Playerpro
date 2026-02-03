import apiClient from './client.js';

export const auth = {
  // Register
  register: async (email, password, full_name) => {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      full_name,
    });
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    return response;
  },

  // Login
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    return response;
  },

  // Get current user
  me: async () => {
    return apiClient.get('/auth/me');
  },

  // Update current user
  updateMe: async (data) => {
    return apiClient.put('/auth/me', data);
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  },

  // Redirect to login (for compatibility)
  redirectToLogin: (returnUrl) => {
    localStorage.removeItem('token');
    window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl || window.location.href)}`;
  },
};

export default auth;
