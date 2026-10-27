import { useState } from "react"
import { ArrowRightLeft, BookOpen, ClipboardPaste, ExternalLink, Loader2, RotateCcw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  GUIDE_URL,
  ONSP_URL,
  handoffUrl,
  resetToConfigToken,
  setRefreshToken,
  type Status,
} from "../api"
import { daysUntil } from "../format"
import { useT } from "../i18n"
import icon from "@/assets/icon.png"
import fb from "@/assets/fblogo.png"

function NewTokenDrawer({ status, ready }: { status: Status | null; ready: boolean }) {
  const { t, rich } = useT()
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="flex-1!">
          <ExternalLink /> {t("PAGE_GET_TOKEN")}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle className="flex flex-col gap-2 items-center pb-8 pt-8 relative">
              <span className="flex items-center flex-row gap-4">
                <img src={icon} alt="" className="h-10 w-20 rounded-lg z-60!" />
                <ArrowRightLeft className="z-60!" />
                <svg className="h-10 w-10 z-60!" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512">
                  <path fill="#1ed760" d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8Z" />
                  <path d="M406.6 231.1c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3zm-31 76.2c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm-26.9 65.6c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4z" />
                </svg>
              </span>
              <span className="z-60!">{t("PAGE_DRAWER_TITLE")}</span>
              <span className="absolute w-32 h-16 rounded-2xl blur-3xl opacity-85 bg-[#1ed760] top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"></span>
            </DrawerTitle>
            <DrawerDescription className="text-center text-balance">
              {rich("PAGE_DRAWER_TEXT", { onsp: <span className="inline-flex items-baseline gap-1"><img src={fb} alt="icon" className="h-3.5 w-3.5 translate-y-0.5" /> onsp.fabriziob.com</span> })}
            </DrawerDescription>
          </DrawerHeader>
          {status?.redirectUri && (
            <p className="px-4 text-xs text-muted-foreground">
              {rich("PAGE_REDIRECT_URI_NOTE", { uri: <code className="break-all">{status.redirectUri}</code> })}
            </p>
          )}
          <DrawerFooter>
            <Button asChild={ready} disabled={!ready} size="lg">
              {ready ? (
                <a href={handoffUrl()}>
                  <ArrowRightLeft /> {t("PAGE_HANDOFF_BUTTON")}
                </a>
              ) : (
                <span>
                  <ArrowRightLeft /> {t("PAGE_HANDOFF_BUTTON")}
                </span>
              )}
            </Button>
            <Button variant="outline" asChild>
              <a href={ONSP_URL}>
                <ClipboardPaste /> {t("PAGE_MANUAL_BUTTON")}
              </a>
            </Button>
            {!ready && (
              <p className="text-xs text-muted-foreground text-center">{t("PAGE_HANDOFF_UNAVAILABLE")}</p>
            )}
            <DrawerClose asChild>
              <Button variant="ghost">{t("PAGE_CANCEL")}</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

type Props = {
  status: Status | null
  onStatus: (status: Status) => void
}

export function TokenCard({ status, onStatus }: Props) {
  const { t, rich } = useT()
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const expired = status?.state === "reauth"
  const expiresSoon = !!status?.token?.expiresBy && daysUntil(status.token.expiresBy) <= 14
  const ready = !!status && status.state !== "waiting"

  async function run(action: () => Promise<Status>) {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      onStatus(await action())
      setSaved(true)
      setToken("")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={expired ? "border-destructive/60" : expiresSoon ? "border-yellow-500/50" : undefined}>
      <CardHeader>
        <CardTitle>{t(expired ? "PAGE_LOGIN_EXPIRED_TITLE" : "PAGE_LOGIN_TITLE")}</CardTitle>
        <CardDescription className="flex flex-col gap-2">
          <span>{t("PAGE_TOKEN_INTRO")}</span>
          <span>{rich("PAGE_TOKEN_STORAGE", { file: <code>.credentials.json</code>, config: <code>config.js</code> })}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row gap-2">
          <NewTokenDrawer status={status} ready={ready} />
          <Button className="shrink-0" variant="outline" asChild>
            <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">
              <BookOpen /> {t("PAGE_MANUAL_GUIDE")}
            </a>
          </Button>
        </div>

        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (token.trim()) run(() => setRefreshToken(token.trim()))
          }}
        >
          <Label htmlFor="refresh-token">{t("PAGE_REFRESH_TOKEN")}</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="refresh-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="AQD..."
              autoComplete="off"
              spellCheck={false}
              disabled={busy || !ready}
            />
            <Button type="submit" disabled={busy || !ready || !token.trim()}>
              {busy && <Loader2 className="animate-spin" />} {t("PAGE_USE_TOKEN")}
            </Button>
          </div>
          {!ready && <p className="text-xs text-muted-foreground">{t("PAGE_AVAILABLE_WHEN_RUNNING")}</p>}
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>{t("PAGE_NOT_SAVED")}</AlertTitle>
            <AlertDescription className="break-all">{error}</AlertDescription>
          </Alert>
        )}
        {saved && !error && (
          <Alert>
            <AlertTitle>{t("PAGE_SAVED")}</AlertTitle>
            <AlertDescription>{t("PAGE_SAVED_TEXT")}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      {status?.token?.source === "credentials" && (
        <CardFooter>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (confirm(t("PAGE_RESET_CONFIRM"))) run(resetToConfigToken)
            }}
          >
            <RotateCcw /> {t("PAGE_RESET")}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
