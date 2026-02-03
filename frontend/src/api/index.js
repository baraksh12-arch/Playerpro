// Main API export - replaces base44Client
import apiClient from './client.js';
import * as entities from './entities.js';
import * as auth from './auth.js';
import * as functions from './functions.js';
import * as integrations from './integrations.js';

// Create a base44-like API object for compatibility
export const api = {
  client: apiClient,
  entities,
  auth,
  functions,
  integrations,
};

// For backward compatibility
export { apiClient, entities, auth, functions, integrations };

export default api;
