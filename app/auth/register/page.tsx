'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Circle } from 'lucide-react'

const isGmailAddress = (email: string) => /^[A-Z0-9._%+-]+@gmail\.com$/i.test(email.trim())

const passwordRequirements = (password: string) => [
  { label: 'Minimal 8 karakter', met: password.length >= 8 },
  { label: 'Memiliki huruf kapital (A-Z)', met: /[A-Z]/.test(password) },
  { label: 'Memiliki huruf kecil (a-z)', met: /[a-z]/.test(password) },
  { label: 'Memiliki angka (0-9)', met: /\d/.test(password) },
  { label: 'Memiliki simbol (contoh: ! @ # $)', met: /[^A-Za-z0-9]/.test(password) },
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const requirements = passwordRequirements(formData.password)
  const isPasswordValid = requirements.every(({ met }) => met)
  const isFormValid =
    formData.name.trim().length > 0 &&
    isGmailAddress(formData.email) &&
    isPasswordValid &&
    formData.password === formData.confirmPassword

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!formData.name.trim() || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Semua field wajib diisi')
      setLoading(false)
      return
    }

    if (!isGmailAddress(formData.email)) {
      setError('Gunakan alamat email dengan domain @gmail.com')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok')
      setLoading(false)
      return
    }

    if (!isPasswordValid) {
      setError('Password belum memenuhi seluruh persyaratan')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registrasi gagal')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (err) {
      setError('Terjadi kesalahan saat registrasi')
      console.error('[v0] Register error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <h2 className="text-2xl font-bold">Registrasi Berhasil!</h2>
            <p className="text-sm text-muted-foreground text-center">
              Akun Anda telah berhasil dibuat. Anda akan dialihkan ke dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Daftar Akun Baru</CardTitle>
          <CardDescription>Buat akun untuk sistem absensi NFC</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex gap-2 items-start">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nama Lengkap
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nama@gmail.com"
                value={formData.email}
                onChange={handleChange}
                pattern="[A-Za-z0-9._%+-]+@gmail\.com"
                aria-invalid={formData.email.length > 0 && !isGmailAddress(formData.email)}
                required
              />
              <p className="text-xs text-muted-foreground">Wajib menggunakan email @gmail.com</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <ul className="space-y-1 pt-1" aria-label="Persyaratan password">
                {requirements.map(({ label, met }) => (
                  <li key={label} className={`flex items-center gap-2 text-xs ${met ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {met ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Konfirmasi Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                aria-invalid={formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword}
                required
              />
              {formData.confirmPassword.length > 0 && (
                <p className={`text-xs ${formData.password === formData.confirmPassword ? 'text-green-700' : 'text-destructive'}`}>
                  {formData.password === formData.confirmPassword ? 'Password cocok' : 'Password belum cocok'}
                </p>
              )}
            </div>

            <Button type="submit" disabled={loading || !isFormValid} className="w-full">
              {loading ? 'Mendaftar...' : 'Daftar'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Sudah punya akun? </span>
              <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
