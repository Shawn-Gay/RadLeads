import { useState, useRef, useCallback } from 'react'
import { Upload, X, ChevronRight, FileText, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImportPersonInput } from '@/types'

interface ImportCSVDialogProps {
  onClose: () => void
  onImport: (people: ImportPersonInput[]) => void
}

type FieldKey =
  | 'firstName' | 'lastName' | 'fullName'
  | 'email' | 'domain' | 'companyName'
  | 'title' | 'phone' | 'city' | 'linkedinUrl'

interface FieldDef {
  key: FieldKey
  label: string
  required?: boolean
  hint?: string
}

const FIELDS: FieldDef[] = [
  { key: 'firstName',   label: 'First Name',                required: true },
  { key: 'lastName',    label: 'Last Name',                 required: true },
  { key: 'fullName',    label: 'Full Name',                 hint: 'Auto-split into first/last' },
  { key: 'email',       label: 'Email',                     required: true },
  { key: 'domain',      label: 'Domain',                    hint: 'Extracted from email if blank' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'title',       label: 'Job Title' },
  { key: 'phone',       label: 'Phone' },
  { key: 'city',        label: 'City' },
  { key: 'linkedinUrl', label: 'LinkedIn URL' },
]

// --- CSV parser ---
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  function parseLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    values.push(current.trim())
    return values
  }

  return { headers: parseLine(lines[0]), rows: lines.slice(1).map(parseLine) }
}

// --- Auto-map CSV headers to our fields ---
function autoMap(headers: string[]): Record<FieldKey, string> {
  const result = {} as Record<FieldKey, string>
  const used = new Set<string>()

  function match(key: FieldKey, tests: string[]) {
    if (result[key]) return
    for (const h of headers) {
      if (used.has(h)) continue
      const hl = h.toLowerCase()
      if (tests.some(t => hl === t || hl.includes(t))) {
        result[key] = h
        used.add(h)
        return
      }
    }
  }

  match('firstName',   ['first name', 'first_name', 'firstname', 'fname'])
  match('lastName',    ['last name', 'last_name', 'lastname', 'lname'])
  match('fullName',    ['full name', 'full_name', 'fullname', 'name'])
  match('email',       ['email', 'e-mail', 'email address'])
  match('domain',      ['domain', 'website', 'url'])
  match('companyName', ['company', 'organization', 'org', 'employer'])
  match('title',       ['title', 'job title', 'position', 'role'])
  match('phone',       ['phone', 'mobile', 'cell', 'telephone'])
  match('city',        ['city', 'location', 'town'])
  match('linkedinUrl', ['linkedin', 'linkedin url', 'linkedin_url'])

  return result
}

// --- Build import objects from mapped rows ---
function buildImportPeople(
  rows: string[][],
  headers: string[],
  mapping: Record<FieldKey, string>
): ImportPersonInput[] {
  function idx(col: string): number { return col ? headers.indexOf(col) : -1 }
  function get(row: string[], col: string): string {
    const i = idx(col)
    return i >= 0 ? (row[i] ?? '').trim() : ''
  }

  return rows
    .map(row => {
      const email = get(row, mapping.email)
      if (!email) return null

      let firstName = get(row, mapping.firstName)
      let lastName  = get(row, mapping.lastName)

      if (!firstName && !lastName && mapping.fullName) {
        const parts = get(row, mapping.fullName).split(/\s+/)
        firstName = parts[0] ?? ''
        lastName  = parts.slice(1).join(' ')
      }

      let domain = get(row, mapping.domain)
      if (!domain && email.includes('@')) domain = email.split('@')[1]

      const companyName = get(row, mapping.companyName) || undefined
      const title       = get(row, mapping.title) || undefined
      const phone       = get(row, mapping.phone) || null
      const city        = get(row, mapping.city) || undefined
      const linkedinUrl = get(row, mapping.linkedinUrl) || undefined

      return {
        firstName: firstName || 'Unknown',
        lastName,
        email,
        domain: domain || 'unknown.com',
        companyName,
        title,
        phone,
        city,
        linkedinUrl,
      }
    })
    .filter(Boolean) as ImportPersonInput[]
}

export function ImportCSVDialog({ onClose, onImport }: ImportCSVDialogProps) {
  const [step, setStep] = useState<'upload' | 'map'>('upload')
  const [dragging, setDragging] = useState(false)
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({} as Record<FieldKey, string>)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function loadFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a .csv file.')
      return
    }
    setError('')
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const result = parseCSV(text)
      if (result.headers.length === 0) { setError('CSV appears to be empty.'); return }
      setParsed(result)
      setMapping(autoMap(result.headers))
      setStep('map')
    }
    reader.readAsText(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  const previewRows = parsed?.rows.slice(0, 5) ?? []

  const canImport = Boolean(
    (mapping.firstName || mapping.fullName) &&
    mapping.email
  )

  function handleImport() {
    if (!parsed) return
    const people = buildImportPeople(parsed.rows, parsed.headers, mapping)
    if (people.length === 0) { setError('No valid rows found (every row needs an email).'); return }
    onImport(people)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Import Leads from CSV</h2>
            <div className="flex items-center gap-1.5 mt-1">
              {(['upload', 'map'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  <span className={cn(
                    'text-[11px] font-medium',
                    step === s ? 'text-blue-600' : 'text-muted-foreground'
                  )}>
                    {i + 1}. {s === 'upload' ? 'Upload File' : 'Map Columns'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'upload' && (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors',
                  dragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-border hover:border-blue-400 hover:bg-muted/50'
                )}
              >
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-full">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Drop your CSV here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Headers in the first row. Needs at least email + name columns.</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
              {error && (
                <div className="mt-3 flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" /> {error}
                </div>
              )}
            </div>
          )}

          {step === 'map' && parsed && (
            <div className="space-y-5">
              {/* File info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{fileName}</span>
                <span>·</span>
                <span>{parsed.rows.length} rows</span>
                <span>·</span>
                <span>{parsed.headers.length} columns</span>
                <button
                  onClick={() => { setStep('upload'); setParsed(null); setMapping({} as Record<FieldKey, string>) }}
                  className="ml-auto text-blue-600 hover:underline"
                >
                  Change file
                </button>
              </div>

              {/* Column mapping */}
              <div>
                <p className="text-xs font-medium text-foreground mb-3">
                  Map your CSV columns to lead fields.
                  <span className="text-muted-foreground font-normal ml-1">We auto-detected what we could.</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {FIELDS.map(field => (
                    <div key={field.key} className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                        {field.hint && <span className="text-[10px] text-muted-foreground/70">({field.hint})</span>}
                      </label>
                      <select
                        value={mapping[field.key] ?? ''}
                        onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="text-xs px-2 py-1.5 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">— skip —</option>
                        {parsed.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              {previewRows.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">Preview (first {previewRows.length} rows)</p>
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-muted border-b border-border">
                        <tr>
                          {['Name', 'Email', 'Domain', 'Title', 'Company'].map(col => (
                            <th key={col} className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {buildImportPeople(previewRows, parsed.headers, mapping).map((p, i) => (
                          <tr key={i} className="hover:bg-muted/50">
                            <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{p.firstName} {p.lastName}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.email}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.domain}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.title ?? '—'}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.companyName ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" /> {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'map' && parsed && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between shrink-0">
            <p className="text-xs text-muted-foreground">
              {buildImportPeople(parsed.rows, parsed.headers, mapping).length} of {parsed.rows.length} rows will be imported
            </p>
            <button
              onClick={handleImport}
              disabled={!canImport}
              className={cn(
                'flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded-md transition-colors',
                canImport
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              Import {parsed.rows.length} leads
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
