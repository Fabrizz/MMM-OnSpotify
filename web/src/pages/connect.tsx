import { useState } from 'react'
import { Loader2, MonitorSmartphone, TriangleAlert } from 'lucide-react'

import { SiteHeader } from '@/components/site-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { loadMirrors, mirrorHost, mirrorStartUrl, normalizeMirrorUrl, saveMirror, type Mirror } from '@/lib/mirrors'
import { PageLayout } from './layout'

/*
 * First step of the handoff: the mirror's module page sends the user here with ?mirror=<page url>.
 * The user picks the mirror to use (the one in the URL is preselected and saved if new), then goes
 * to that mirror, which starts the Spotify login.
 */

function readMirror() {
  try {
    return normalizeMirrorUrl(new URLSearchParams(window.location.search).get('mirror') ?? '')
  } catch {
    return null
  }
}

type Option = Mirror & { isNew: boolean }

// The mirror from the URL first (new or saved), then the other saved mirrors
function mirrorOptions(current: string | null): Option[] {
  const saved = loadMirrors()
  const options: Option[] = []
  if (current) {
    const existing = saved.find((m) => m.url === current)
    options.push(existing ? { ...existing, isNew: false } : { url: current, name: mirrorHost(current), savedAt: 0, isNew: true })
  }
  for (const m of saved) if (m.url !== current) options.push({ ...m, isNew: false })
  return options
}

export default function Connect() {
  const current = readMirror()
  const [options] = useState(() => mirrorOptions(current))
  const [selected, setSelected] = useState(options[0]?.url ?? '')
  const [newName, setNewName] = useState(current ? mirrorHost(current) : '')
  const [open, setOpen] = useState(options.length > 0)
  const [going, setGoing] = useState<string | null>(null)

  const choice = options.find((o) => o.url === selected)

  function go() {
    if (!choice) return
    const name = choice.isNew ? newName.trim() || choice.name : choice.name
    if (choice.isNew) saveMirror(choice.url, name)
    setGoing(name)
    setOpen(false)
    window.location.replace(mirrorStartUrl(choice.url))
  }

  return (
    <PageLayout>
      <SiteHeader />
      {going ? (
        <Alert>
          <Loader2 className="animate-spin" />
          <AlertTitle>Going back to {going}</AlertTitle>
          <AlertDescription>Your mirror is starting the Spotify login.</AlertDescription>
        </Alert>
      ) : options.length === 0 ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Missing mirror address</AlertTitle>
          <AlertDescription>
            Open this from the module page on your mirror (/onspotify/), or add one in <a href="/my" className="underline">My mirrors</a>.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="opacity-90">Choose the mirror that should get the new Spotify login.</p>
          <Button onClick={() => setOpen(true)}>
            <MonitorSmartphone /> Choose a mirror
          </Button>
        </div>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>Which mirror?</DrawerTitle>
              <DrawerDescription>
                Your mirror starts the Spotify login and gets the new token. Your Client Secret stays on the mirror.
              </DrawerDescription>
            </DrawerHeader>

            <RadioGroup value={selected} onValueChange={setSelected} className="px-4 gap-2 max-h-[45vh] overflow-y-auto">
              {options.map((option) => (
                <Label
                  key={option.url}
                  htmlFor={option.url}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer has-[[data-state=checked]]:border-green-500/60 has-[[data-state=checked]]:bg-green-500/5"
                >
                  <RadioGroupItem value={option.url} id={option.url} />
                  <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-medium truncate">
                      {option.name}
                      {option.url === current && (
                        <Badge variant="outline" className="border-green-500/60 text-green-500">
                          {option.isNew ? 'New' : 'This mirror'}
                        </Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal break-all">{option.url}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>

            {choice?.isNew && (
              <div className="flex flex-col gap-2 px-4 pt-4">
                <Label htmlFor="connect-name">Name for this mirror</Label>
                <Input id="connect-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <p className="text-xs text-muted-foreground">It is saved in this browser, you can manage it in My mirrors.</p>
              </div>
            )}

            <DrawerFooter>
              <Button size="lg" onClick={go} disabled={!choice}>
                {choice?.isNew ? 'Save and continue' : `Continue with ${choice?.name ?? 'this mirror'}`}
              </Button>
              {current && (
                <Button variant="outline" asChild>
                  <a href={current}>Back to the mirror</a>
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </PageLayout>
  )
}
