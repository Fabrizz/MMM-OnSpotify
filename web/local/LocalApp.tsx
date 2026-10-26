import { CircleAlert, CircleCheck, WifiOff } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import icon from "@/assets/icon.png"
import { readReauthResult, useModuleEvents } from "./api"
import { NowPlayingCard } from "./components/NowPlayingCard"
import { StatusCard } from "./components/StatusCard"
import { TokenCard } from "./components/TokenCard"

// Read once at load (not in render), it also removes ?reauth from the URL
const reauthResult = readReauthResult()

export default function LocalApp() {
  const { status, setStatus, nowPlaying, online } = useModuleEvents()

  return (
    <main className="min-h-dvh px-4 py-8 flex justify-center">
      <div className="w-full max-w-xl flex flex-col gap-5">
        <header className="flex items-center gap-3">
          <img src={icon} alt="" className="h-9 w-18 rounded-lg" />
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold leading-tight">Authentication Settings</h1>
            <span className="text-sm text-muted-foreground">
              <a href="https://github.com/Fabrizz/MMM-OnSpotify" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                MMM-OnSpotify
              </a>{" "}
              by{" "}
              <a href="https://fabriziob.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                Fabrizz
              </a>
            </span>

          </div>
          {status?.version && (
            <a
              href={`https://github.com/Fabrizz/MMM-OnSpotify/releases/tag/v${status.version}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md border px-2 py-0.5 text-xs text-muted-foreground tabular-nums hover:text-foreground transition-colors"
              title="Module version"
            >
              v{status.version}
            </a>
          )}
        </header>

        {reauthResult &&
          (reauthResult.ok ? (
            <Alert>
              <CircleCheck className="text-green-500" />
              <AlertTitle>Connected with your new Spotify login</AlertTitle>
              <AlertDescription>The module is using the new token, it lasts 6 months.</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>The Spotify login did not finish</AlertTitle>
              <AlertDescription className="break-words">{reauthResult.reason || "Unknown error"}</AlertDescription>
            </Alert>
          ))}

        {!online && (
          <Alert variant="destructive">
            <WifiOff />
            <AlertTitle>Can't reach the mirror</AlertTitle>
            <AlertDescription>Retrying...</AlertDescription>
          </Alert>
        )}

        <StatusCard status={status} />
        {status?.state !== "reauth" && <NowPlayingCard nowPlaying={nowPlaying} />}
        <TokenCard status={status} onStatus={setStatus} />

        <footer className="text-xs text-muted-foreground text-center">
          <p>This page is served by the MMM-OnSpotify module. It is not an official Spotify product.</p>
          <p>You can find the source code inside <code>/web</code> and <code>/web/local</code></p>
        </footer>
      </div>
    </main>
  )
}
