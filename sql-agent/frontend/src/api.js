async function request(path, data) {
  let response
  try {
    response = await fetch('/api/' + path, data ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    } : {})
  } catch {
    throw new Error('Cannot reach the backend. Check that FastAPI is running.')
  }
  const body = await response.json().catch(() => null)
  if (!response.ok || !body) {
    throw new Error(typeof body?.detail === 'string' ? body.detail : 'The backend could not complete the request. Please retry.')
  }
  return body
}

export const getSchema = () => request('schema')
export const ask = (session_id, message) => request('chat', { session_id, message })
export const reset = session_id => request('reset', { session_id })
