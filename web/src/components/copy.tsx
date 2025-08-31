import * as React from "react"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"

export function CopyButton({ value, className = "" }: { value: string, className?: string }) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) // reset after 2s
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      className={className}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )
}
