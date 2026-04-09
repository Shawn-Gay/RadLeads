import { useState, useCallback } from 'react'

export function useLocalStorage<T>(key: string, initial: T): [T, (val: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : initial
    } catch {
      return initial
    }
  })

  const set = useCallback((val: T) => {
    setValue(val)
    try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* quota */ }
  }, [key])

  return [value, set]
}
