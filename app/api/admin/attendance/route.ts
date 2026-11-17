import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - admin access required' } as ApiResponse,
        { status: 403 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const userId = searchParams.get('userId')

    let query = supabaseAdmin
      .from('attendance')
      .select(
        `id, date, check_in, check_out, created_at, users:user_id (id, name, email)`,
        { count: 'exact' }
      )
      .order('date', { ascending: false })

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (dateFrom) {
      query = query.gte('date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('date', dateTo)
    }

    // Get paginated results (count included in same query)
    const { data: records, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('[v0] Admin attendance error:', error)
      return NextResponse.json(
        { success: false, error: 'Gagal mengambil data' } as ApiResponse,
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          records,
          total: count,
          limit,
          offset,
        },
      } as ApiResponse,
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Admin attendance error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' } as ApiResponse,
      { status: 500 }
    )
  }
}
