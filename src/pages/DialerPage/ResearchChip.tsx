interface ResearchChipProps {
  href: string
  icon: React.ReactNode
  label: string
  title?: string
}

export function ResearchChip({ href, icon, label, title }: ResearchChipProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title ?? label}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-muted/40 hover:bg-muted hover:border-blue-300 dark:hover:border-blue-800 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {icon}
      <span>{label}</span>
    </a>
  )
}
