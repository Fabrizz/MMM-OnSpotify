import { useEffect, useState } from "react"
import { Loader2, MonitorSmartphone, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  findMirror,
  isMirrorState,
  mirrorCallbackUrl,
  mirrorFromState,
  mirrorHost,
  saveMirror,
  touchMirror,
} from "@/lib/mirrors"

/*
 * Spotify sends mirror logins here too (it is the redirect URI). The login code is forwarded
 * to the mirror that started it, which exchanges it with its client secret.
 * Saved mirrors are forwarded right away, unknown ones need confirmation.
 */

const params = new URLSearchParams(window.location.search)
const state = params.get("state")

function clearQuery() {
  window.history.replaceState({}, document.title, window.location.pathname)
}

export function MirrorHandoff() {
  const mirror = isMirrorState(state) ? mirrorFromState(state!) : null
  const saved = mirror ? findMirror(mirror) : undefined
  const [open, setOpen] = useState(isMirrorState(state))
  const [sending, setSending] = useState(!!saved)

  function send(url: string) {
    setSending(true)
    touchMirror(url)
    window.location.replace(mirrorCallbackUrl(url, params))
  }

  useEffect(() => {
    if (saved) send(saved.url)
  }, [])

  if (!isMirrorState(state)) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (sending) return
        setOpen(value)
        if (!value) clearQuery()
      }}
    >
      <DialogContent>
        {!mirror ? (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-5 text-destructive" /> Invalid mirror login
            </DialogTitle>
            <DialogDescription>
              This Spotify login does not say which mirror it belongs to. Start again from your mirror's module page.
            </DialogDescription>
          </DialogHeader>
        ) : sending ? (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="size-5 animate-spin" /> Sending you back to your mirror
            </DialogTitle>
            <DialogDescription>
              {saved?.name ?? mirrorHost(mirror)} ({mirrorHost(mirror)}) is finishing the Spotify login.
            </DialogDescription>
          </DialogHeader>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MonitorSmartphone className="size-5 text-green-500" /> Send this login to {mirrorHost(mirror)}?
              </DialogTitle>
              <DialogDescription>
                It will be saved as one of your mirrors in this browser. Only continue if you started the login from
                that mirror's module page.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); clearQuery() }}>
                Cancel
              </Button>
              <Button onClick={() => { saveMirror(mirror); send(mirror) }}>Save mirror and continue</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
