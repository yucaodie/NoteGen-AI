'use client'

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Suspense, useEffect } from "react"
import { NextIntlProvider } from "@/components/providers/NextIntlProvider"
import { TextSizeProvider } from "@/contexts/text-size-context"
import { SettingsDialog } from "@/app/core/setting/components/settings-dialog"
import 'react-photo-view/dist/react-photo-view.css'
import { useI18n } from "@/hooks/useI18n"
import { applyThemeColors } from "@/lib/theme-utils"
import { applyAppFontFamily } from "@/lib/font-settings"

function useInitTheme() {
  useEffect(() => {
    try {
      applyThemeColors()
      applyAppFontFamily()
    } catch { /* browser-only */ }
  }, [])
}

export default function CoreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { currentLocale } = useI18n()
  useInitTheme()

  return (
    <ThemeProvider>
      <TooltipProvider>
        <Suspense fallback={null}>
          <NextIntlProvider>
            <TextSizeProvider>
              {children}
              <SettingsDialog />
            </TextSizeProvider>
          </NextIntlProvider>
        </Suspense>
        <Toaster closeButton richColors position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}
