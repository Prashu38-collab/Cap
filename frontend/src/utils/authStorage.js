/**
 * Authentication utility for managing user login state via localStorage.
 *
 * Login.jsx stores:
 *   localStorage.token   -> JWT access token
 *   localStorage.user    -> JSON { user_id, name, email }
 */

export function getCurrentUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem("token") || null;
}

export function isLoggedIn() {
  return !!getToken() && !!getCurrentUser();
}

export function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
