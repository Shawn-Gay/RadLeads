import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

// Enrichment is now part of the Leads page.
export function EnrichPage() {
  const navigate = useNavigate()
  useEffect(() => { navigate({ to: '/leads', replace: true }) }, [navigate])
  return null
}
