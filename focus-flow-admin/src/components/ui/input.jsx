import { cn } from '@/lib/utils'

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm',
        'shadow-sm transition-all duration-150',
        'placeholder:text-muted-foreground/60',
        'hover:border-border/80',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:border-primary/60',
        'disabled:cursor-not-allowed disabled:opacity-50 text-foreground',
        className
      )}
      {...props}
    />
  )
}

export { Input }
