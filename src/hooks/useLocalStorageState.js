import { useEffect, useState } from 'react'

export function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // localStorage unavailable (private browsing, quota) — state stays in memory only
    }
  }, [key, state])

  return [state, setState]
}
