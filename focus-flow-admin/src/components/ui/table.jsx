import { cn } from '@/lib/utils'

function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />
}

function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors duration-150',
        'hover:bg-secondary/40 data-[state=selected]:bg-secondary',
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider',
        '[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }) {
  return (
    <td
      className={cn('px-4 py-3.5 align-middle [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
