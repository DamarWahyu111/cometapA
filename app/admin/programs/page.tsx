'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AlertCircle, Pencil, Plus, Trash2, Users } from 'lucide-react'

type Program = {
  id: string
  name: string
  created_at: string
  user_count: number
}

export default function AdminProgramsPage() {
  const router = useRouter()
  const [programs, setPrograms] = useState<Program[]>([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/programs')
      const data = await response.json()
      if (response.status === 401 || response.status === 403) {
        router.push('/auth/login')
        return
      }
      if (!response.ok) throw new Error(data.error)
      setPrograms(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat program')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadPrograms()
  }, [loadPrograms])

  const submitProgram = async (event: FormEvent) => {
    event.preventDefault()
    const programName = editing ? editing.name : name
    if (!programName.trim()) return

    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/admin/programs', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, name: editing.name } : { name }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setName('')
      setEditing(null)
      await loadPrograms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan program')
    } finally {
      setSaving(false)
    }
  }

  const deleteProgram = async (program: Program) => {
    if (!window.confirm(`Hapus program “${program.name}”?`)) return

    setError('')
    try {
      const response = await fetch('/api/admin/programs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: program.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      await loadPrograms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus program')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName="Admin" isAdmin />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Kelola Program</h1>
          <p className="mt-2 text-muted-foreground">Tambah, ubah, dan atur program peserta.</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? 'Ubah Program' : 'Tambah Program'}</CardTitle>
            <CardDescription>Nama program akan tersedia pada form pendaftaran.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitProgram} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={editing ? editing.name : name}
                onChange={(event) => editing ? setEditing({ ...editing, name: event.target.value }) : setName(event.target.value)}
                placeholder="Contoh: Magang/PKL 2026"
                maxLength={100}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  <Plus className="size-4" />
                  {saving ? 'Menyimpan...' : editing ? 'Simpan' : 'Tambah'}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Program</CardTitle>
            <CardDescription>{programs.length} program tersedia</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, index) => <div key={index} className="h-14 animate-pulse rounded bg-muted" />)}</div>
            ) : programs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Belum ada program.</p>
            ) : (
              <div className="divide-y rounded-md border">
                {programs.map((program) => (
                  <div key={program.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium">{program.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3" /> {program.user_count} pengguna</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(program)}><Pencil /> Ubah</Button>
                      <Button size="sm" variant="destructive" disabled={program.user_count > 0} onClick={() => deleteProgram(program)}><Trash2 /> Hapus</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
