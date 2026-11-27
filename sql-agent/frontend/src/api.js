const TOKEN_KEY = 'sql-agent-token'

export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = token => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(path, data, method) {
  const token = getToken()
  const headers = {}
  if (data) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  let response
  try {
    response = await fetch('/api/' + path, {
      method: method || (data ? 'POST' : 'GET'),
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the backend. Check that FastAPI is running.')
  }
  const body = await response.json().catch(() => null)
  if (!response.ok || !body) {
    const err = new Error(typeof body?.detail === 'string' ? body.detail : 'The backend could not complete the request. Please retry.')
    err.status = response.status
    throw err
  }
  return body
}

export const signup = (name, email, password) => request('auth/signup', { name, email, password })
export const login = (email, password) => request('auth/login', { email, password })
export const getMe = () => request('auth/me')
export const getSchema = () => request('schema')
export const ask = (session_id, message) => request('chat', { session_id, message })
export const reset = session_id => request('reset', { session_id })
