'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, Settings, User } from 'lucide-react'

interface DashboardHeaderProps {
  userName?: string
  isAdmin?: boolean
}

export function DashboardHeader({ userName = 'User', isAdmin = false }: DashboardHeaderProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/login')
    } catch (err) {
      console.error('[v0] Logout error:', err)
    }
  }

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div>
          <Link href={isAdmin ? '/admin/users' : '/dashboard'} className="font-bold text-lg">
            NFC Attendance
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {isAdmin ? (
            <>
              <Link
                href="/admin/users"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Users
              </Link>
              <Link
                href="/admin/attendance"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Attendance
              </Link>
              <Link
                href="/admin/programs"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Program
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/bind-nfc"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Bind NFC
              </Link>
              <Link
                href="/dashboard/history"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                History
              </Link>
            </>
          )}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-full">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline-block ml-2 text-sm">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm">
              <p className="font-semibold">{userName}</p>
              <p className="text-xs text-muted-foreground">{isAdmin ? 'Admin' : 'User'}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={isAdmin ? '/admin/users' : '/dashboard'} className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {isLoggingOut ? 'Logout...' : 'Logout'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
