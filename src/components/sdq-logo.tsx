import { cn } from '@/lib/utils'

interface SdqLogoProps {
  full?: boolean
  className?: string
  alt?: string
}

export function SdqLogo({ full = false, className, alt = 'SDQ Sameday Q-Rier' }: SdqLogoProps) {
  const src = full ? '/sdq-logo.jpg' : '/sdq-mark.jpg'
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'block shrink-0 object-cover',
        full ? 'rounded-xl' : 'rounded-lg',
        className,
      )}
      draggable={false}
    />
  )
}
