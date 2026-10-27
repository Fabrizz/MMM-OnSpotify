import { CircleAlert, CircleCheck, WifiOff } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import icon from "@/assets/icon.png"
import { readReauthResult, useModuleEvents } from "./api"
import { I18nProvider, useT } from "./i18n"
import { NowPlayingCard } from "./components/NowPlayingCard"
import { StatusCard } from "./components/StatusCard"
import { TokenCard } from "./components/TokenCard"

// Read once at load (not in render), it also removes ?reauth from the URL
const reauthResult = readReauthResult()

export default function LocalApp() {
  const events = useModuleEvents()
  return (
    <I18nProvider language={events.status?.language}>
      <Page {...events} />
    </I18nProvider>
  )
}

function Page({ status, setStatus, nowPlaying, online }: ReturnType<typeof useModuleEvents>) {
  const { t, rich } = useT()

  return (
    <main className="min-h-dvh px-4 py-8 flex justify-center">
      <div className="w-full max-w-xl flex flex-col gap-5">
        <header className="flex items-center gap-3">
          <img src={icon} alt="" className="h-9 w-18 rounded-lg" />
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold leading-tight">{t("PAGE_TITLE")}</h1>
            <span className="text-sm text-muted-foreground">
              <a href="https://github.com/Fabrizz/MMM-OnSpotify" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                MMM-OnSpotify
              </a>{" "}
              {t("PAGE_BY")}{" "}
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
              title={t("PAGE_VERSION_TITLE")}
            >
              v{status.version}
            </a>
          )}
        </header>

        {reauthResult &&
          (reauthResult.ok ? (
            <Alert>
              <CircleCheck className="text-green-500" />
              <AlertTitle>{t("PAGE_HANDOFF_OK_TITLE")}</AlertTitle>
              <AlertDescription>{t("PAGE_HANDOFF_OK_TEXT")}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>{t("PAGE_HANDOFF_ERROR_TITLE")}</AlertTitle>
              <AlertDescription className="break-words">{reauthResult.reason || t("PAGE_UNKNOWN_ERROR")}</AlertDescription>
            </Alert>
          ))}

        {!online && (
          <Alert variant="destructive">
            <WifiOff />
            <AlertTitle>{t("PAGE_OFFLINE_TITLE")}</AlertTitle>
            <AlertDescription>{t("PAGE_OFFLINE_TEXT")}</AlertDescription>
          </Alert>
        )}

        <StatusCard status={status} />
        {status?.state !== "reauth" && <NowPlayingCard nowPlaying={nowPlaying} />}
        <TokenCard status={status} onStatus={setStatus} />

        <footer className="text-xs text-muted-foreground text-center">
          <p>{t("PAGE_FOOTER_NOTICE")}</p>
          <p>{rich("PAGE_FOOTER_SOURCE", { web: <code>/web</code>, local: <code>/web/local</code> })}</p>
        </footer>
      </div>
    </main>
  )
}
