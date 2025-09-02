
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  SidebarMenuButton
} from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isMobile = useIsMobile();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  if (isMobile) {
      return (
          <Button variant="ghost" className="w-full justify-start gap-2 p-2 text-sm font-normal" onClick={toggleTheme}>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span>Cambiar Tema</span>
          </Button>
      )
  }

  return (
    <SidebarMenuButton onClick={toggleTheme} tooltip="Cambiar Tema">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span>Cambiar Tema</span>
    </SidebarMenuButton>
  )
}

    