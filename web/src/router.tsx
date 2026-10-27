import type { ReactNode } from 'react'
import App from './App.tsx'
import Connect from './pages/connect.tsx'
import MyMirrors from './pages/my.tsx'

/*
 * Basic path router. Cloudflare Pages serves index.html for every path (SPA mode,
 * no top-level 404.html), so /my and /connect load this same entry.
 * Links are plain <a href>, each page is a full load.
 */
const routes: Record<string, () => ReactNode> = {
  '/': () => <App />,
  '/my': () => <MyMirrors />,
  '/connect': () => <Connect />,
}

// "/my/" and "/my" are the same page
const currentPath = () => window.location.pathname.replace(/\/+$/, '') || '/'

function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center gap-2 min-h-dvh px-4 text-center">
      <h1 className="text-2xl">Page not found</h1>
      <a href="/" className="underline underline-offset-2 decoration-green-500">Go to MMM-OnSpotify</a>
    </main>
  )
}

export function Router() {
  const route = routes[currentPath()]
  return route ? route() : <NotFound />
}
