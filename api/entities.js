import apiClient from './client.js';

// Entity API wrapper
class EntityAPI {
  constructor(entityName) {
    this.entityName = entityName;
  }

  async list(sort = '-created_at', limit = null) {
    const params = {};
    if (sort) params.sort = sort;
    if (limit) params.limit = limit;
    return apiClient.get(`/${this.entityName}`, { params });
  }

  async get(id) {
    return apiClient.get(`/${this.entityName}/${id}`);
  }

  async create(data) {
    return apiClient.post(`/${this.entityName}`, data);
  }

  async update(id, data) {
    return apiClient.put(`/${this.entityName}/${id}`, data);
  }

  async delete(id) {
    return apiClient.delete(`/${this.entityName}/${id}`);
  }

  async filter(filters = {}, sort = '-created_at', limit = null) {
    return apiClient.post(`/${this.entityName}/filter`, filters, {
      params: { sort, limit },
    });
  }
}

// Special entity handlers for nested routes
const LessonScheduleAPI = {
  list: (sort, limit) => apiClient.get('/lessons/schedules', { params: { sort, limit } }),
  create: (data) => apiClient.post('/lessons/schedules', data),
  update: (id, data) => apiClient.put(`/lessons/schedules/${id}`, data),
  delete: (id) => apiClient.delete(`/lessons/schedules/${id}`),
  filter: (filters, sort, limit) => apiClient.get('/lessons/schedules', { params: { ...filters, sort, limit } }),
};

const LessonHistoryAPI = {
  list: (sort, limit) => apiClient.get('/lessons/history', { params: { sort, limit } }),
  create: (data) => apiClient.post('/lessons/history', data),
  update: (id, data) => apiClient.put(`/lessons/history/${id}`, data),
  delete: (id) => apiClient.delete(`/lessons/history/${id}`),
  filter: (filters, sort, limit) => apiClient.get('/lessons/history', { params: { ...filters, sort, limit } }),
};

const PracticeSessionAPI = {
  list: (sort, limit) => apiClient.get('/practice/sessions', { params: { sort, limit } }),
  create: (data) => apiClient.post('/practice/sessions', data),
  filter: (filters, sort, limit) => apiClient.get('/practice/sessions', { params: { ...filters, sort, limit } }),
};

const PracticeRoutineAPI = {
  list: (sort, limit) => apiClient.get('/practice/routines', { params: { sort, limit } }),
  create: (data) => apiClient.post('/practice/routines', data),
  delete: (id) => apiClient.delete(`/practice/routines/${id}`),
  filter: (filters, sort, limit) => apiClient.get('/practice/routines', { params: { ...filters, sort, limit } }),
};

// Create entity instances
export const Task = new EntityAPI('tasks');
export const LessonSchedule = LessonScheduleAPI;
export const LessonHistory = LessonHistoryAPI;
export const Recording = new EntityAPI('recordings');
export const PracticeSession = PracticeSessionAPI;
export const PracticeRoutine = PracticeRoutineAPI;
export const Material = new EntityAPI('materials');
export const Recommendation = new EntityAPI('recommendations');
export const ChatMessage = new EntityAPI('chat');
export const Announcement = new EntityAPI('announcements');
export const TeacherUpdate = new EntityAPI('management/teacher-updates');
export const Reference = new EntityAPI('teacher/references');
export const SongIndex = new EntityAPI('management/song-index');
export const TeacherActivationSerial = new EntityAPI('management/teacher-serials');
export const TeacherInviteCode = new EntityAPI('teacher/invite-codes');
export const AgentInfo = new EntityAPI('management/agent-info');

// Student Material (special handling)
export const StudentMaterial = {
  list: (studentId) => apiClient.get(`/materials/student/${studentId}`),
  create: (data) => apiClient.post('/materials/student', data),
  delete: (studentId, materialId) => apiClient.delete(`/materials/student/${studentId}/${materialId}`),
};

// User entity (special handling)
export const User = {
  list: (sort, limit) => apiClient.get('/users', { params: { sort, limit } }),
  get: (id) => apiClient.get(`/users/${id}`),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  filter: (filters) => apiClient.post('/users/filter', filters),
};

// Query helper (for compatibility with base44 style)
export const Query = {
  filter: (entity, filters, sort, limit) => {
    const entityMap = {
      Task,
      LessonSchedule,
      LessonHistory,
      Recording,
      PracticeSession,
      Material,
      Recommendation,
      ChatMessage,
      Announcement,
      User,
    };
    const entityAPI = entityMap[entity];
    if (!entityAPI) throw new Error(`Unknown entity: ${entity}`);
    if (entityAPI.filter) {
      return entityAPI.filter(filters, sort, limit);
    }
    // Fallback for entities without filter method
    return entityAPI.list(sort, limit);
  },
};
