import { useEffect, useState } from 'react'

const KEY = 'radleads-dark-mode'

function getInitial(): boolean {
  const stored = localStorage.getItem(KEY)
  if (stored !== null) return stored === 'true'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(getInitial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(KEY, String(dark))
  }, [dark])

  return { dark, toggle: () => setDark(o => !o) }
}
