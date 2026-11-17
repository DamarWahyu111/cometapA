import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/lib/types'

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const payload = token ? await verifyToken(token) : null
  return payload?.role === 'admin'
}

function invalidProgramName(name: unknown) {
  return typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ success: false, error: 'Forbidden' } as ApiResponse, { status: 403 })
    }

    const [{ data: programs, error: programsError }, { data: users, error: usersError }] = await Promise.all([
      supabaseAdmin.from('programs').select('id, name, created_at').order('name'),
      supabaseAdmin.from('users').select('program_id'),
    ])

    if (programsError || usersError) {
      return NextResponse.json(
        { success: false, error: 'Gagal memuat program' } as ApiResponse,
        { status: 500 }
      )
    }

    const userCountByProgram = (users || []).reduce<Record<string, number>>((counts, user) => {
      if (user.program_id) counts[user.program_id] = (counts[user.program_id] || 0) + 1
      return counts
    }, {})

    return NextResponse.json({
      success: true,
      data: (programs || []).map((program) => ({
        ...program,
        user_count: userCountByProgram[program.id] || 0,
      })),
    } as ApiResponse)
  } catch (error) {
    console.error('[v0] Admin programs fetch error:', error)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' } as ApiResponse, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ success: false, error: 'Forbidden' } as ApiResponse, { status: 403 })
    }

    const { name } = await request.json()
    if (invalidProgramName(name)) {
      return NextResponse.json({ success: false, error: 'Nama program harus 2–100 karakter' } as ApiResponse, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('programs')
      .insert({ name: name.trim() })
      .select('id, name, created_at')
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: 'Gagal menambah program' } as ApiResponse, { status: 500 })
    }

    return NextResponse.json({ success: true, data } as ApiResponse, { status: 201 })
  } catch (error) {
    console.error('[v0] Admin program create error:', error)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' } as ApiResponse, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ success: false, error: 'Forbidden' } as ApiResponse, { status: 403 })
    }

    const { id, name } = await request.json()
    if (typeof id !== 'string' || invalidProgramName(name)) {
      return NextResponse.json({ success: false, error: 'Data program tidak valid' } as ApiResponse, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('programs')
      .update({ name: name.trim() })
      .eq('id', id)
      .select('id, name, created_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Program tidak ditemukan atau gagal diperbarui' } as ApiResponse, { status: 400 })
    }

    return NextResponse.json({ success: true, data } as ApiResponse)
  } catch (error) {
    console.error('[v0] Admin program update error:', error)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' } as ApiResponse, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ success: false, error: 'Forbidden' } as ApiResponse, { status: 403 })
    }

    const { id } = await request.json()
    if (typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'ID program tidak valid' } as ApiResponse, { status: 400 })
    }

    const { count, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', id)

    if (usersError) {
      return NextResponse.json({ success: false, error: 'Gagal memeriksa pengguna program' } as ApiResponse, { status: 500 }
      )
    }

    if ((count || 0) > 0) {
      return NextResponse.json(
        { success: false, error: 'Program masih memiliki pengguna dan tidak dapat dihapus' } as ApiResponse,
        { status: 409 }
      )
    }

    const { error } = await supabaseAdmin.from('programs').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ success: false, error: 'Gagal menghapus program' } as ApiResponse, { status: 500 })
    }

    return NextResponse.json({ success: true } as ApiResponse)
  } catch (error) {
    console.error('[v0] Admin program delete error:', error)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' } as ApiResponse, { status: 500 })
  }
}
