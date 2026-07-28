"use client"
 
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
 
const DEFAULT_PROPS = {
  attribute: "class",
  defaultTheme: "system",
  enableSystem: true,
  disableTransitionOnChange: true,
} as const

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...DEFAULT_PROPS} {...props}>{children}</NextThemesProvider>
}