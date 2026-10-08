// Cliente HTTP para la API serverless. Mismo origen, sin CORS.

async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const get = (path) => request(path, { method: 'GET' });
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body || {}) });
const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body || {}) });
const del = (path, body) =>
  request(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined });

export const api = {
  // Público
  listVideos: () => get('/api/videos'),
  getVideo: (idOrSlug) => get(`/api/videos/${encodeURIComponent(idOrSlug)}`),
  getComments: (videoId) => get(`/api/videos/${encodeURIComponent(videoId)}/comments`),
  postComment: (videoId, { nickname, text }) =>
    post(`/api/videos/${encodeURIComponent(videoId)}/comments`, { nickname, text }),

  // Admin
  login: (username, password) => post('/api/admin/login', { username, password }),
  logout: () => post('/api/admin/logout'),
  me: () => get('/api/admin/me'),
  adminCreateVideo: (data) => post('/api/admin/videos', data),
  adminUpdateVideo: (id, data) => put(`/api/admin/videos/${encodeURIComponent(id)}`, data),
  adminDeleteVideo: (id) => del(`/api/admin/videos/${encodeURIComponent(id)}`),
  adminDeleteComment: (videoId, commentId) =>
    del(`/api/admin/comments/${encodeURIComponent(commentId)}`, { videoId }),
};
