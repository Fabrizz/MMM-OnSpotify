import { useEffect, useState, type ReactNode } from "react"
import { EyeOff, Laptop, Music, Pause, Smartphone, Speaker, Tv } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { NowPlaying } from "../api"
import { formatDuration } from "../format"

function DeviceIcon({ type }: { type?: string }) {
  switch ((type || "").toLowerCase()) {
    case "smartphone":
      return <Smartphone className="size-4" />
    case "speaker":
      return <Speaker className="size-4" />
    case "tv":
      return <Tv className="size-4" />
    default:
      return <Laptop className="size-4" />
  }
}

// Current progress, animated locally between events
function useProgress(item: NowPlaying) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!item.isPlaying) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [item])
  const elapsed = item.isPlaying ? now - item.receivedAt : 0
  return Math.min(item.duration ?? 0, (item.progress ?? 0) + Math.max(0, elapsed))
}

function Playing({ item }: { item: NowPlaying }) {
  const progress = useProgress(item)
  const duration = item.duration ?? 0
  return (
    <CardContent className="relative flex flex-col sm:flex-row gap-5">
      {item.image ? (
        <>
          <img src={item.image} alt="" className="size-40 sm:size-32 rounded-lg object-cover shadow-md self-center z-10" />
          <img src={item.image} alt="" className="opacity-70 size-40 sm:size-32 rounded-lg object-cover shadow-md self-center absolute blur-2xl z-0" />
        </>
      ) : (
        <div className="size-40 sm:size-32 rounded-lg bg-muted flex items-center justify-center self-center">
          <Music className="text-muted-foreground" />
        </div>
      )}
      <div className="flex flex-col justify-center min-w-0 flex-1 z-10">
        <p className="text-lg font-semibold truncate z-10">{item.name}</p>
        <p className="text-muted-foreground truncate z-10">{item.artists}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2 z-10">
          {!item.isPlaying && <Pause className="size-4" />}
          <DeviceIcon type={item.deviceType} />
          <span className="truncate">{item.device}</span>
        </p>
        {duration > 0 && (
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground tabular-nums z-10">
            <span>{formatDuration(progress)}</span>
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-[width] duration-500 ease-linear"
                style={{ width: `${(progress / duration) * 100}%` }}
              />
            </div>
            <span>{formatDuration(duration)}</span>
          </div>
        )}
      </div>
    </CardContent>
  )
}

function Message({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <CardContent className="flex items-center gap-3 text-muted-foreground z-10s">
      {icon}
      <span>{text}</span>
    </CardContent>
  )
}

export function NowPlayingCard({ nowPlaying }: { nowPlaying: NowPlaying | null }) {
  let content
  if (!nowPlaying || nowPlaying.empty)
    content = (
      <Message
        icon={<Music className="size-5" />}
        text={
          nowPlaying?.filteredDevice
            ? `Playing on ${nowPlaying.filteredDevice}, which is filtered by deviceFilter`
            : "Nothing playing right now"
        }
      />
    )
  else if (nowPlaying.private)
    content = (
      <Message icon={<EyeOff className="size-5" />} text={`Private session on ${nowPlaying.device ?? "a device"}`} />
    )
  else content = <Playing item={nowPlaying} />

  return <Card className="relative overflow-hidden!">{content}</Card>
}
