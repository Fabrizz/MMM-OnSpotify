import { CircleAlert, CircleCheck, KeyRound, Loader2, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ModuleState, Status } from "../api"
import { daysUntil, formatDate } from "../format"

const STATE_LABEL: Record<ModuleState, string> = {
  waiting: "Waiting for the mirror",
  connected: "Connected",
  reauth: "Login expired",
  error: "Connection error",
}

function StateBadge({ state }: { state: ModuleState }) {
  if (state === "connected")
    return (
      <Badge className="bg-green-600/20 text-green-400 border-green-600/40">
        <CircleCheck /> {STATE_LABEL[state]}
      </Badge>
    )
  if (state === "waiting")
    return (
      <Badge variant="secondary">
        <Loader2 className="animate-spin" /> {STATE_LABEL[state]}
      </Badge>
    )
  return (
    <Badge variant="destructive">
      <CircleAlert /> {STATE_LABEL[state]}
    </Badge>
  )
}

function TokenExpiry({ token }: { token: NonNullable<Status["token"]> }) {
  if (!token.expiresBy) return <span>Unknown expiration</span>
  const days = daysUntil(token.expiresBy)
  // Without an authorization date we only know the latest possible expiration
  const exact = token.authorizedAt !== null
  const when = days <= 0 ? "Expired" : exact ? `Expires in ${days} days` : `Expires in ${days} days at the latest`
  return (
    <span className={"text-sm text-muted-foreground " + (days <= 14 ? "text-yellow-400" : "")}>
      {when} ({formatDate(token.expiresBy)})
    </span>
  )
}

export function StatusCard({ status }: { status: Status | null }) {
  const state = status?.state ?? "waiting"
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-4">
        {status?.user?.image ? (
          <span className="relative size-14">
            <img src={status.user.image} alt="" className="size-14 rounded-full object-cover z-10" />
            <img src={status.user.image} alt="" className="opacity-70 z-0 top-0 left-0 absolute blur-xl size-14 rounded-full object-cover" />
          </span>
        ) : (
          <div className="size-14 rounded-full bg-muted flex items-center justify-center">
            <UserRound className="z-10 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-0.5 min-w-0">
          <CardTitle className="truncate z-10">
            {status?.user?.name ?? "Spotify account"}
            </CardTitle>
          <CardDescription className="uppercase z-10">
            {status?.user?.product ?? "Unknown product"}
          </CardDescription>
          <span className="absolute top-4 right-4">
            <StateBadge state={state} />
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 z-10 border-t pt-6">
        {state === "waiting" && (
          <p>The module starts when the mirror page is open. Open MagicMirror and this page will update.</p>
        )}
        {state === "error" && status?.error && <p className="text-destructive break-words">{status.error}</p>}
        {status?.token && (
          <p className="flex items-center gap-4">
            <span className="relative size-14 items-center justify-center flex shrink-0 bg-green-500/25 rounded-full">
              <KeyRound className="size-5 shrink-0" />
            </span>
            <span className="flex flex-col gap-0">
              <span>{status.token.source === "config" ? "Token from config.js" : "Token saved by the module"}</span>
              <TokenExpiry token={status.token} />
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
