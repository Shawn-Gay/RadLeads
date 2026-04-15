import { Phone } from 'lucide-react'
import { cn, formatPhone } from '@/lib/utils'

interface PhoneNumberProps {
  phone: string
  /** Show Phone icon. Default: true */
  icon?: boolean
  /** Class applied to the icon (color etc). Default: inherits text color */
  iconColor?: string
  size?: 'xs' | 'sm' | 'md'
  /** Wrap in tel: anchor. Default: true. Ignored when onClick is provided. */
  asLink?: boolean
  /** Custom click handler — renders as <button> instead of anchor */
  onClick?: (e: React.MouseEvent) => void
  title?: string
  className?: string
}

const SIZES = {
  xs: { icon: 'h-3 w-3',     text: 'text-[11px]', gap: 'gap-1'   },
  sm: { icon: 'h-3.5 w-3.5', text: 'text-xs',     gap: 'gap-1.5' },
  md: { icon: 'h-4 w-4',     text: 'text-sm',      gap: 'gap-2'   },
}

export function PhoneNumber({
  phone,
  icon = true,
  iconColor,
  size = 'sm',
  asLink = true,
  onClick,
  title,
  className,
}: PhoneNumberProps) {
  const s = SIZES[size]
  const inner = (
    <>
      {icon && <Phone className={cn(s.icon, 'shrink-0', iconColor)} />}
      <span className={cn('font-mono font-medium', s.text)}>{formatPhone(phone)}</span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        title={title}
        onClick={onClick}
        className={cn('flex items-center', s.gap, className)}
      >
        {inner}
      </button>
    )
  }

  if (asLink) {
    return (
      <a
        href={`tel:${phone}`}
        title={title}
        className={cn('flex items-center', s.gap, className)}
        onClick={e => e.stopPropagation()}
      >
        {inner}
      </a>
    )
  }

  return (
    <span title={title} className={cn('flex items-center', s.gap, className)}>
      {inner}
    </span>
  )
}
