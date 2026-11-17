import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashPassword, verifyToken } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import { ApiResponse } from '@/lib/types'

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const payload = token ? await verifyToken(token) : null
  return payload?.role === 'admin'
}

function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%^&*'
  const all = upper + lower + numbers + symbols

  const sample = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]

  for (let i = 0; i < 6; i++) {
    sample.push(all[Math.floor(Math.random() * all.length)])
  }

  return sample.sort(() => Math.random() - 0.5).join('')
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - admin access required' } as ApiResponse,
        { status: 403 }
      )
    }

    // Get query parameters for pagination and search
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''
    const programId = searchParams.get('programId') || ''

    let query = supabaseAdmin
      .from('users')
      .select('id, name, email, nfc_uid, role, program_id, created_at, programs:program_id(id, name)', { count: 'exact' })
      .neq('role', 'admin')
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply program filter if provided
    if (programId) {
      query = query.eq('program_id', programId)
    }

    // Get paginated results (count included in same query)
    const { data: users, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('[v0] Admin users error:', error)
      return NextResponse.json(
        { success: false, error: 'Gagal mengambil data pengguna' } as ApiResponse,
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          users,
          total: count,
          limit,
          offset,
        },
      } as ApiResponse,
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Admin users error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' } as ApiResponse,
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - admin access required' } as ApiResponse,
        { status: 403 }
      )
    }

    const { name, email, password, programId, sendEmail = true } = await request.json()

    const normalizedName = typeof name === 'string' ? name.trim() : ''
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    let finalPassword = typeof password === 'string' && password.trim() ? password.trim() : ''

    if (!normalizedName) {
      return NextResponse.json(
        { success: false, error: 'Nama pengguna wajib diisi' } as ApiResponse,
        { status: 400 }
      )
    }

    if (!normalizedEmail || !/^[A-Z0-9._%+-]+@gmail\.com$/i.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Email wajib menggunakan domain @gmail.com' } as ApiResponse,
        { status: 400 }
      )
    }

    if (typeof programId !== 'string' || !programId) {
      return NextResponse.json(
        { success: false, error: 'Pilih program terlebih dahulu' } as ApiResponse,
        { status: 400 }
      )
    }

    // Verify program exists
    const { data: program, error: programError } = await supabaseAdmin
      .from('programs')
      .select('id, name')
      .eq('id', programId)
      .maybeSingle()

    if (programError || !program) {
      return NextResponse.json(
        { success: false, error: 'Program yang dipilih tidak valid atau tidak ditemukan' } as ApiResponse,
        { status: 400 }
      )
    }

    // If password was not specified manually, auto-generate one
    if (!finalPassword) {
      finalPassword = generateSecurePassword()
    } else {
      const passwordIsValid =
        finalPassword.length >= 8 &&
        /[A-Z]/.test(finalPassword) &&
        /[a-z]/.test(finalPassword) &&
        /\d/.test(finalPassword) &&
        /[^A-Za-z0-9]/.test(finalPassword)

      if (!passwordIsValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Password manual harus minimal 8 karakter serta memiliki huruf kapital, huruf kecil, angka, dan simbol',
          } as ApiResponse,
          { status: 400 }
        )
      }
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email sudah terdaftar di sistem' } as ApiResponse,
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(finalPassword)

    // Insert user
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          name: normalizedName,
          email: normalizedEmail,
          password: hashedPassword,
          program_id: program.id,
          role: 'user',
        },
      ])
      .select('id, name, email, nfc_uid, program_id, role, created_at')
      .single()

    if (insertError || !newUser) {
      console.error('[v0] Admin create user error:', insertError)
      return NextResponse.json(
        { success: false, error: 'Gagal menyimpan pengguna baru ke database' } as ApiResponse,
        { status: 500 }
      )
    }

    // Send email notification if enabled
    let emailResult: { success: boolean; error?: string } = {
      success: false,
      error: 'Pengiriman email dinonaktifkan',
    }
    if (sendEmail) {
      const appUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}/auth/login`
      emailResult = await sendWelcomeEmail({
        to: normalizedEmail,
        name: normalizedName,
        email: normalizedEmail,
        password: finalPassword,
        programName: program.name,
        appUrl,
      })
    }

    // Record audit log (non-blocking)
    try {
      const token = request.cookies.get('auth-token')?.value
      const payload = token ? await verifyToken(token) : null
      if (payload) {
        await supabaseAdmin.from('admin_logs').insert([
          {
            admin_id: payload.userId,
            action: 'CREATE_USER',
            target_user_id: newUser.id,
            details: {
              user_name: normalizedName,
              user_email: normalizedEmail,
              program_name: program.name,
              admin_email: payload.email,
            },
          },
        ])
      }
    } catch (logErr) {
      console.warn('[v0] Could not record admin log:', logErr)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Pengguna berhasil didaftarkan',
        data: {
          user: {
            ...newUser,
            programs: program,
          },
          generatedPassword: finalPassword,
          emailSent: emailResult.success,
          emailError: emailResult.error,
        },
      } as ApiResponse,
      { status: 201 }
    )
  } catch (error) {
    console.error('[v0] Admin create user error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server saat membuat pengguna' } as ApiResponse,
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const payload = token ? await verifyToken(token) : null

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - admin access required' } as ApiResponse,
        { status: 403 }
      )
    }

    const { userId, programId } = await request.json()

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User ID tidak valid' } as ApiResponse,
        { status: 400 }
      )
    }

    // Get current user and program
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, program_id, programs:program_id(id, name)')
      .eq('id', userId)
      .maybeSingle()

    if (userError || !currentUser) {
      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan' } as ApiResponse,
        { status: 404 }
      )
    }

    let newProgramName = 'Tanpa Program'
    let finalProgramId: string | null = null

    if (programId) {
      const { data: targetProg, error: progError } = await supabaseAdmin
        .from('programs')
        .select('id, name')
        .eq('id', programId)
        .maybeSingle()

      if (progError || !targetProg) {
        return NextResponse.json(
          { success: false, error: 'Program tujuan tidak ditemukan' } as ApiResponse,
          { status: 404 }
        )
      }
      finalProgramId = targetProg.id
      newProgramName = targetProg.name
    }

    const currentPrograms = currentUser.programs as unknown as { id: string; name: string } | null
    const oldProgramName = currentPrograms?.name || 'Tanpa Program'

    // Update user program in Supabase
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ program_id: finalProgramId })
      .eq('id', userId)
      .select('id, name, email, nfc_uid, program_id, role, created_at, programs:program_id(id, name)')
      .single()

    if (updateError || !updatedUser) {
      console.error('[v0] Update user program error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Gagal memperbarui program pengguna di database' } as ApiResponse,
        { status: 500 }
      )
    }

    // Insert into admin_logs for audit tracking (non-blocking)
    try {
      await supabaseAdmin.from('admin_logs').insert([
        {
          admin_id: payload.userId,
          action: 'UPDATE_PROGRAM',
          target_user_id: userId,
          details: {
            user_name: currentUser.name,
            user_email: currentUser.email,
            old_program: oldProgramName,
            new_program: newProgramName,
            admin_email: payload.email,
          },
        },
      ])
    } catch (logErr) {
      console.warn('[v0] Could not record admin log:', logErr)
    }

    return NextResponse.json(
      {
        success: true,
        message: `Program untuk ${currentUser.name} berhasil diubah ke "${newProgramName}"`,
        data: updatedUser,
      } as ApiResponse,
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Admin update user program error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server saat memperbarui program' } as ApiResponse,
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const payload = token ? await verifyToken(token) : null

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - admin access required' } as ApiResponse,
        { status: 403 }
      )
    }

    const { userId } = await request.json()

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User ID tidak valid' } as ApiResponse,
        { status: 400 }
      )
    }

    if (userId === payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat menghapus akun admin Anda sendiri' } as ApiResponse,
        { status: 400 }
      )
    }

    // Get user info first
    const { data: userToDelete, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role')
      .eq('id', userId)
      .maybeSingle()

    if (findError || !userToDelete) {
      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan' } as ApiResponse,
        { status: 404 }
      )
    }

    // Delete user from database (attendance records cascade automatically)
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('[v0] Delete user error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Gagal menghapus pengguna dari database' } as ApiResponse,
        { status: 500 }
      )
    }

    // Record audit log
    try {
      await supabaseAdmin.from('admin_logs').insert([
        {
          admin_id: payload.userId,
          action: 'DELETE_USER',
          target_user_id: null,
          details: {
            user_name: userToDelete.name,
            user_email: userToDelete.email,
            admin_email: payload.email,
          },
        },
      ])
    } catch (logErr) {
      console.warn('[v0] Could not record admin log:', logErr)
    }

    return NextResponse.json(
      {
        success: true,
        message: `Akun ${userToDelete.name} (${userToDelete.email}) berhasil dihapus`,
      } as ApiResponse,
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Admin delete user error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server saat menghapus pengguna' } as ApiResponse,
      { status: 500 }
    )
  }
}
