'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  History,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import Link from 'next/link'

interface Program {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
  nfc_uid: string | null
  role: string
  program_id: string | null
  programs?: Program | null
  created_at: string
}

interface CreateUserResult {
  user: User
  generatedPassword: string
  emailSent: boolean
  emailError?: string
}

interface AdminLog {
  id: string
  admin_id: string
  action: string
  target_user_id: string
  details?: {
    user_name?: string
    user_email?: string
    old_program?: string
    new_program?: string
    program_name?: string
    admin_email?: string
  }
  created_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Create User Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [autoPassword, setAutoPassword] = useState(true)
  const [showCustomPassword, setShowCustomPassword] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [createdResult, setCreatedResult] = useState<CreateUserResult | null>(null)

  // Edit User Program Modal State
  const [isEditProgramOpen, setIsEditProgramOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<User | null>(null)
  const [newProgramId, setNewProgramId] = useState<string>('')
  const [editProgramLoading, setEditProgramLoading] = useState(false)
  const [editProgramError, setEditProgramError] = useState('')

  // Delete Confirm Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Admin Logs Modal State
  const [isLogsOpen, setIsLogsOpen] = useState(false)
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    programId: '',
    customPassword: '',
  })

  // Load programs for dropdowns
  const fetchPrograms = async () => {
    try {
      const res = await fetch('/api/programs')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setPrograms(data.data)
      }
    } catch (err) {
      console.error('[v0] Fetch programs error:', err)
    }
  }

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchUsers = async (pageNum: number = 0, searchTerm: string = '', progId: string = '') => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '20')
      params.set('offset', String(pageNum * 20))
      if (searchTerm) params.set('search', searchTerm)
      if (progId) params.set('programId', progId)

      const res = await fetch('/api/admin/users?' + params)

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login')
        } else {
          setError('Gagal memuat data pengguna')
        }
        return
      }

      const data = await res.json()

      if (pageNum === 0) {
        setUsers(data.data?.users || [])
        setTotal(data.data?.total || 0)
      } else {
        setUsers((prev) => [...prev, ...(data.data?.users || [])])
      }

      setHasMore((data.data?.users || []).length === 20)
    } catch (err) {
      console.error('[v0] Users fetch error:', err)
      setError('Terjadi kesalahan saat memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(0, search, selectedProgram)
  }, [router, selectedProgram])

  const handleSearch = (searchTerm: string) => {
    setSearch(searchTerm)
    setPage(0)
    setUsers([])
    setLoading(true)
    fetchUsers(0, searchTerm, selectedProgram)
  }

  const handleProgramFilter = (progId: string) => {
    setSelectedProgram(progId)
    setPage(0)
    setUsers([])
    setLoading(true)
    fetchUsers(0, search, progId)
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchUsers(nextPage, search, selectedProgram)
  }

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      email: '',
      programId: programs[0]?.id || '',
      customPassword: '',
    })
    setAutoPassword(true)
    setShowCustomPassword(false)
    setSendEmail(true)
    setCreateError('')
    setCreatedResult(null)
    setIsCreateOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    if (!formData.name.trim()) {
      setCreateError('Nama lengkap wajib diisi')
      return
    }

    if (!formData.email.trim() || !/^[A-Z0-9._%+-]+@gmail\.com$/i.test(formData.email.trim())) {
      setCreateError('Email wajib menggunakan format @gmail.com')
      return
    }

    if (!formData.programId) {
      setCreateError('Silakan pilih program peserta')
      return
    }

    if (!autoPassword && formData.customPassword.length < 8) {
      setCreateError('Password manual minimal 8 karakter dengan huruf kapital, kecil, angka & simbol')
      return
    }

    setCreateLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          programId: formData.programId,
          password: autoPassword ? '' : formData.customPassword,
          sendEmail,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCreateError(data.error || 'Gagal menambahkan pengguna')
        return
      }

      setCreatedResult({
        user: data.data.user,
        generatedPassword: data.data.generatedPassword,
        emailSent: data.data.emailSent,
        emailError: data.data.emailError,
      })

      // Refresh table data
      fetchUsers(0, search, selectedProgram)
    } catch (err) {
      console.error('[v0] Create user error:', err)
      setCreateError('Terjadi kesalahan saat mendaftarkan pengguna')
    } finally {
      setCreateLoading(false)
    }
  }

  // Open Edit Program Modal
  const handleOpenEditProgram = (user: User) => {
    setUserToEdit(user)
    setNewProgramId(user.program_id || '')
    setEditProgramError('')
    setIsEditProgramOpen(true)
  }

  // Submit Edit Program
  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userToEdit) return

    setEditProgramLoading(true)
    setEditProgramError('')

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userToEdit.id,
          programId: newProgramId || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setEditProgramError(data.error || 'Gagal memperbarui program pengguna')
        return
      }

      setIsEditProgramOpen(false)
      setSuccessMessage(data.message || 'Program berhasil diperbarui')
      setTimeout(() => setSuccessMessage(''), 4000)

      // Refresh table
      fetchUsers(0, search, selectedProgram)
    } catch (err) {
      console.error('[v0] Edit user program error:', err)
      setEditProgramError('Terjadi kesalahan saat memperbarui program')
    } finally {
      setEditProgramLoading(false)
    }
  }

  // Delete User — open confirm modal
  const handleDeleteUser = (user: User) => {
    setUserToDelete(user)
    setIsDeleteOpen(true)
  }

  // Delete User — execute after confirm
  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    setDeleteLoading(true)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userToDelete.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Gagal menghapus pengguna')
        setIsDeleteOpen(false)
        return
      }

      setSuccessMessage(data.message || 'Pengguna berhasil dihapus')
      setTimeout(() => setSuccessMessage(''), 4000)
      setIsDeleteOpen(false)
      setUserToDelete(null)

      // Refresh table
      fetchUsers(0, search, selectedProgram)
    } catch (err) {
      console.error('[v0] Delete user error:', err)
      setError('Terjadi kesalahan saat menghapus pengguna')
      setIsDeleteOpen(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Open Logs Modal
  const handleOpenLogs = async () => {
    setIsLogsOpen(true)
    setLogsLoading(true)
    try {
      const res = await fetch('/api/admin/logs')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setLogs(data.data)
      }
    } catch (err) {
      console.error('[v0] Fetch logs error:', err)
    } finally {
      setLogsLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName="Admin" isAdmin={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Kelola Pengguna</h1>
            <p className="text-muted-foreground">Total: {total} pengguna terdaftar</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleOpenLogs} className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              Log Perubahan
            </Button>
            <Button onClick={handleOpenCreateModal} className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Tambah Pengguna
            </Button>
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex gap-2 items-center mb-6">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex gap-2 items-start mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter & Pencarian Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  type="search"
                  placeholder="Cari berdasarkan nama atau email..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <select
                  value={selectedProgram}
                  onChange={(e) => handleProgramFilter(e.target.value)}
                  className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                >
                  <option value="">Semua Program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Tidak ada pengguna ditemukan</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Nama</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Program</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">NFC Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Terdaftar</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium">{user.name}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4 text-sm">
                        {user.programs?.name ? (
                          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-xs font-medium">
                            {user.programs.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Tanpa Program</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {user.nfc_uid ? (
                          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full w-fit text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="font-medium">Terdaftar</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full w-fit text-xs">
                            <Smartphone className="w-3.5 h-3.5" />
                            <span className="font-medium">Belum Terdaftar</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleOpenEditProgram(user)}
                            title="Ubah Program Peserta"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteUser(user)}
                            title="Hapus Akun Pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button onClick={handleLoadMore} variant="outline">
                  Muat Lebih Banyak
                </Button>
              </div>
            )}
          </>
        )}

        <div className="mt-6">
          <Link href="/admin/attendance">
            <Button variant="outline">Lihat Riwayat Absensi</Button>
          </Link>
        </div>
      </main>

      {/* MODAL: Tambah Pengguna Baru */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription>
              Daftarkan peserta baru. Kredensial login dapat dikirimkan otomatis ke email peserta.
            </DialogDescription>
          </DialogHeader>

          {createdResult ? (
            <div className="space-y-4 py-2">
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Pengguna Berhasil Dibuat!</p>
                  <p className="mt-1">Akun atas nama <strong>{createdResult.user.name}</strong> siap digunakan.</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <Mail className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-sm font-semibold text-blue-900">Kredensial tersedia melalui email terdaftar</p>
                <p className="text-xs text-blue-700 mt-1">
                  Detail login telah dikirimkan langsung ke <strong>{createdResult.user.email}</strong>
                </p>
              </div>

              {!createdResult.emailSent && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Email otomatis belum terkirim: </span>
                    <span>{createdResult.emailError || 'Konfigurasi SMTP belum diatur di .env.local'}. Hubungi admin untuk mendapatkan kredensial login.</span>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-4">
                <Button onClick={() => setIsCreateOpen(false)} className="w-full">
                  Selesai
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs flex gap-2 items-center">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nama Lengkap</label>
                <Input
                  required
                  placeholder="Misal: Ahmad Fauzi"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email (@gmail.com)</label>
                <Input
                  type="email"
                  required
                  placeholder="ahmad@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Program Peserta</label>
                <select
                  required
                  value={formData.programId}
                  onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                  className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                >
                  <option value="" disabled>Pilih Program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <label htmlFor="autoPassword" className="text-sm font-medium cursor-pointer">
                    Generate Password Otomatis
                  </label>
                  <input
                    type="checkbox"
                    id="autoPassword"
                    checked={autoPassword}
                    onChange={(e) => setAutoPassword(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {!autoPassword && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-medium text-muted-foreground">Password Kustom</label>
                    <div className="relative">
                      <Input
                        type={showCustomPassword ? 'text' : 'password'}
                        placeholder="Minimal 8 karakter (A-Z, a-z, 0-9, simbol)"
                        value={formData.customPassword}
                        onChange={(e) => setFormData({ ...formData, customPassword: e.target.value })}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCustomPassword(!showCustomPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                        aria-label={showCustomPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      >
                        {showCustomPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="sendEmail" className="text-sm cursor-pointer">
                    Kirim kredensial via Email otomatis
                  </label>
                </div>
              </div>

              <DialogFooter className="mt-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createLoading}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Mendaftarkan...
                    </>
                  ) : (
                    'Daftarkan Pengguna'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: Ubah Program Peserta */}
      <Dialog open={isEditProgramOpen} onOpenChange={setIsEditProgramOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Program Peserta</DialogTitle>
            <DialogDescription>
              Perbarui divisi, lantai, atau program penempatan untuk peserta ini.
            </DialogDescription>
          </DialogHeader>

          {userToEdit && (
            <form onSubmit={handleSaveProgram} className="space-y-4 py-2">
              {editProgramError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs flex gap-2 items-center">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{editProgramError}</span>
                </div>
              )}

              <div className="bg-muted/50 p-3 rounded-lg border text-sm space-y-1">
                <div className="font-semibold text-foreground">{userToEdit.name}</div>
                <div className="text-xs text-muted-foreground">{userToEdit.email}</div>
                <div className="text-xs pt-1">
                  Program Saat Ini:{' '}
                  <span className="font-medium text-purple-700">
                    {userToEdit.programs?.name || 'Tanpa Program'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Pilih Program Baru</label>
                <select
                  value={newProgramId}
                  onChange={(e) => setNewProgramId(e.target.value)}
                  className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                >
                  <option value="">Tanpa Program (Kosongkan)</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Perubahan program akan langsung terupdate di database Supabase dan tercatat di log audit.
                </p>
              </div>

              <DialogFooter className="mt-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditProgramOpen(false)}
                  disabled={editProgramLoading}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={editProgramLoading}>
                  {editProgramLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: Log Aktivitas Admin */}
      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Log Perubahan & Aktivitas Admin
            </DialogTitle>
            <DialogDescription>
              Catatan riwayat perubahan program dan penambahan pengguna oleh admin.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-3">
            {logsLoading ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Memuat riwayat log...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 border rounded-lg bg-muted/20">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
                <p className="text-sm font-medium">Belum ada riwayat perubahan</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Perubahan program dan pembuatan pengguna baru oleh admin akan tercatat secara otomatis di sini.
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                      log.action === 'DELETE_USER'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : log.action === 'UPDATE_PROGRAM'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {log.action === 'DELETE_USER'
                        ? 'HAPUS PENGGUNA'
                        : log.action === 'UPDATE_PROGRAM'
                        ? 'UBAH PROGRAM'
                        : 'TAMBAH PENGGUNA'}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {log.action === 'DELETE_USER' ? (
                    <div>
                      <p className="text-sm font-medium text-red-600">
                        Menghapus akun: <strong>{log.details?.user_name}</strong>
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Email: {log.details?.user_email}
                      </p>
                      {log.details?.admin_email && (
                        <p className="text-[10px] text-muted-foreground pt-1">
                          Oleh Admin: {log.details.admin_email}
                        </p>
                      )}
                    </div>
                  ) : log.action === 'UPDATE_PROGRAM' ? (
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Program <strong>{log.details?.user_name || 'Peserta'}</strong> diubah
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Dari <span className="line-through text-red-500">{log.details?.old_program || '-'}</span> menjadi <span className="text-green-600 font-semibold">{log.details?.new_program || '-'}</span>
                      </p>
                      {log.details?.admin_email && (
                        <p className="text-[10px] text-muted-foreground pt-1">
                          Oleh Admin: {log.details.admin_email}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Mendaftarkan pengguna: <strong>{log.details?.user_name}</strong>
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Email: {log.details?.user_email} | Program: <span className="text-purple-600 font-medium">{log.details?.program_name || '-'}</span>
                      </p>
                      {log.details?.admin_email && (
                        <p className="text-[10px] text-muted-foreground pt-1">
                          Oleh Admin: {log.details.admin_email}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mt-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setIsLogsOpen(false)} className="w-full">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MODAL: Konfirmasi Hapus Pengguna */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!deleteLoading) setIsDeleteOpen(open) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <DialogTitle className="text-lg">Hapus Pengguna</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              Anda akan menghapus akun{' '}
              <span className="font-semibold text-foreground">{userToDelete?.name}</span>{' '}
              <span className="text-muted-foreground">({userToDelete?.email})</span>.
              <br />
              <span className="text-red-600 font-medium mt-2 block">
                Semua riwayat absensi akan ikut terhapus secara permanen dan tidak dapat dipulihkan.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteLoading}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Menghapus...
                </span>
              ) : (
                'Ya, Hapus Akun'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
