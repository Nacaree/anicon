"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock } from "lucide-react"

// Scroll-wheel style time picker built with shadcn primitives.
// Shows a popover with three scrollable columns: hour, minute, AM/PM.
// Selected time uses the AniCon orange primary color.
function TimePicker({ value, onChange, placeholder = "Pick a time" }) {
  const [open, setOpen] = React.useState(false)

  // Parse HH:MM string into { hour12, minute, period }
  const parsed = React.useMemo(() => {
    if (!value) return { hour12: null, minute: null, period: null }
    const [h, m] = value.split(':').map(Number)
    return {
      hour12: h === 0 ? 12 : h > 12 ? h - 12 : h,
      minute: m,
      period: h < 12 ? 'AM' : 'PM',
    }
  }, [value])

  // Format display string
  const displayValue = React.useMemo(() => {
    if (!value) return null
    const { hour12, minute, period } = parsed
    return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
  }, [value, parsed])

  // Build new HH:MM from selections
  const buildTime = (hour12, minute, period) => {
    let h24 = hour12
    if (period === 'AM') {
      h24 = hour12 === 12 ? 0 : hour12
    } else {
      h24 = hour12 === 12 ? 12 : hour12 + 12
    }
    return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  const handleHourSelect = (h) => {
    const minute = parsed.minute ?? 0
    const period = parsed.period ?? 'PM'
    onChange(buildTime(h, minute, period))
  }

  const handleMinuteSelect = (m) => {
    const hour12 = parsed.hour12 ?? 12
    const period = parsed.period ?? 'PM'
    onChange(buildTime(hour12, m, period))
  }

  const handlePeriodSelect = (p) => {
    const hour12 = parsed.hour12 ?? 12
    const minute = parsed.minute ?? 0
    onChange(buildTime(hour12, minute, p))
  }

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={cn(
            "w-full justify-start text-left font-normal rounded-lg h-10",
            !value && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x">
          {/* Hours column */}
          <ScrollArea className="h-56 w-20">
            <div className="p-1">
              <p className="text-xs font-medium text-muted-foreground text-center mb-1">Hour</p>
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleHourSelect(h)}
                  className={cn(
                    "w-full rounded-md py-1.5 text-sm transition-colors",
                    parsed.hour12 === h
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Minutes column */}
          <ScrollArea className="h-56 w-20">
            <div className="p-1">
              <p className="text-xs font-medium text-muted-foreground text-center mb-1">Min</p>
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMinuteSelect(m)}
                  className={cn(
                    "w-full rounded-md py-1.5 text-sm transition-colors",
                    parsed.minute === m
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* AM/PM column */}
          <div className="p-1 flex flex-col justify-start w-16">
            <p className="text-xs font-medium text-muted-foreground text-center mb-1">Period</p>
            {['AM', 'PM'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodSelect(p)}
                className={cn(
                  "w-full rounded-md py-1.5 text-sm transition-colors",
                  parsed.period === p
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { TimePicker }
