import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types'

export async function GET() {
  try {
    const { data: programs, error } = await supabase
      .from('programs')
      .select('id, name, created_at')
      .order('name')

    if (error) {
      console.error('[v0] Programs fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'Gagal memuat daftar program' } as ApiResponse,
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: programs } as ApiResponse)
  } catch (error) {
    console.error('[v0] Programs fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' } as ApiResponse,
      { status: 500 }
    )
  }
}
