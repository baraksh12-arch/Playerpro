// Replaced with new API client
import api from './index.js';

// For backward compatibility - mimics base44 SDK structure
export const base44 = {
  auth: api.auth,
  entities: api.entities,
  functions: api.functions,
  integrations: api.integrations,
  appLogs: {
    logUserInApp: async (pageName) => {
      // Placeholder for app logging - implement analytics if needed
      console.log('User navigated to:', pageName);
      return Promise.resolve();
    },
  },
  // Placeholder for service role access (admin functions)
  asServiceRole: {
    entities: api.entities,
  },
};
