import { cn } from '@/lib/utils'

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-white/10 bg-card text-card-foreground',
        'shadow-[var(--shadow-sm)] transition-all duration-200',
        'hover:border-primary/40 hover:shadow-[0_0_24px_rgba(99,102,241,.18),0_4px_16px_rgba(0,0,0,.4)]',
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1 p-5', className)} {...props} />
}

function CardTitle({ className, ...props }) {
  return <h3 className={cn('font-semibold leading-tight tracking-tight text-foreground', className)} {...props} />
}

function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground leading-relaxed', className)} {...props} />
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center p-5 pt-0', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
