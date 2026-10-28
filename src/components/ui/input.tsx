import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('ui-input h-11 w-full rounded-lg border px-3 text-sm focus:outline-none', className)} {...props} />
}
