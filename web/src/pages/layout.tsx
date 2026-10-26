import type { ReactNode } from 'react'

/** Layout for the extra pages (/my, /connect), same width as the main page. */
export function PageLayout({ children }: { children: ReactNode }) {
  return <main className="flex flex-col max-w-3xl mx-auto px-4 min-h-dvh">{children}</main>
}
