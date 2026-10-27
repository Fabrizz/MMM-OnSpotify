import { useState } from 'react'
import { ExternalLink, MonitorSmartphone, Pencil, Plus, Trash2 } from 'lucide-react'

import { SiteHeader } from '@/components/site-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loadMirrors, mirrorHost, normalizeMirrorUrl, removeMirror, renameMirror, saveMirror, type Mirror } from '@/lib/mirrors'
import { PageLayout } from './layout'

const formatDate = (time: number) =>
  new Date(time).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

function MirrorItem({ mirror, onChange }: { mirror: Mirror; onChange: () => void }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 min-w-0">
          <MonitorSmartphone className="size-4 shrink-0 text-green-500" />
          <span className="truncate">{mirror.name}</span>
        </CardTitle>
        <CardDescription className="break-all">{mirror.url}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <p className="text-xs text-muted-foreground">
          Saved {formatDate(mirror.savedAt)}
          {mirror.lastUsedAt && ` · Last login ${formatDate(mirror.lastUsedAt)}`}
        </p>
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <a href={mirror.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Open
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const name = prompt('Mirror name', mirror.name)
              if (name && name.trim()) {
                renameMirror(mirror.url, name.trim())
                onChange()
              }
            }}
          >
            <Pencil /> Rename
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm(`Remove ${mirror.name} from this browser?`)) {
                removeMirror(mirror.url)
                onChange()
              }
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MyMirrors() {
  const [mirrors, setMirrors] = useState(loadMirrors)
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const refresh = () => setMirrors(loadMirrors())

  function add(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const url = normalizeMirrorUrl(address)
      saveMirror(url, name.trim() || undefined)
      setAddress('')
      setName('')
      refresh()
    } catch {
      setError('Enter an address like 192.168.1.20:8080 or http://mirror.local:8080')
    }
  }

  return (
    <PageLayout>
      <SiteHeader />
      <div className="mb-6">
        <h1 className="leading-11 font-sans text-3xl font-normal">My mirrors <span className="text-sm font-extralight">(handoff)</span></h1>
        <p className="opacity-90">
          Mirrors are saved only in this browser. They are added when you get a new token from a mirror's module page
          (<code className='px-1'>http://{"<"}yourmirror{">"}/onspotify</code>), or you can add one below.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {mirrors.length === 0 ? (
          <Alert>
            <MonitorSmartphone />
            <AlertTitle>No mirrors yet</AlertTitle>
            <AlertDescription>Open the module page on your mirror and use the onsp handoff, or add it here.</AlertDescription>
          </Alert>
        ) : (
          mirrors.map((mirror) => <MirrorItem key={mirror.url} mirror={mirror} onChange={refresh} />)
        )}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add a mirror</CardTitle>
          <CardDescription>The address you use to open MagicMirror from this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 gap-4" autoComplete="off">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mirror-address">Address</Label>
              <Input id="mirror-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="192.168.1.20:8080" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mirror-name">Name (optional)</Label>
              <Input id="mirror-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Living room" />
            </div>
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
            {address.trim() && !error && (
              <p className="text-xs text-muted-foreground sm:col-span-2 break-all">
                {(() => {
                  try {
                    return `Module page: ${normalizeMirrorUrl(address)} (${mirrorHost(normalizeMirrorUrl(address))})`
                  } catch {
                    return null
                  }
                })()}
              </p>
            )}
            <Button type="submit" className="sm:col-span-2" disabled={!address.trim()}>
              <Plus /> Add mirror
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
