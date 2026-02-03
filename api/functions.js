import apiClient from './client.js';

export const functions = {
  invoke: async (functionName, data = {}) => {
    return apiClient.post(`/functions/${functionName}`, data);
  },
};

export default functions;
