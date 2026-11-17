import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const payload = token ? await verifyToken(token) : null

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - admin access required' } as ApiResponse,
        { status: 403 }
      )
    }

    const { data: logs, error } = await supabaseAdmin
      .from('admin_logs')
      .select('id, admin_id, action, target_user_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.warn('[v0] Admin logs query notice:', error.message)
      // If table doesn't exist yet in Supabase, return empty array gracefully
      return NextResponse.json({ success: true, data: [] } as ApiResponse)
    }

    return NextResponse.json({ success: true, data: logs || [] } as ApiResponse)
  } catch (error) {
    console.error('[v0] Admin logs error:', error)
    return NextResponse.json({ success: true, data: [] } as ApiResponse)
  }
}
