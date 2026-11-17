import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { comparePassword, createToken, setAuthCookie } from '@/lib/auth'
import { ApiResponse, AuthResponse } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan password diperlukan' } as ApiResponse,
        { status: 400 }
      )
    }

    // Find user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' } as ApiResponse,
        { status: 401 }
      )
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' } as ApiResponse,
        { status: 401 }
      )
    }

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Set cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login berhasil',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            nfc_uid: user.nfc_uid,
            program_id: user.program_id,
            role: user.role,
            created_at: user.created_at,
          },
        } as AuthResponse,
      } as ApiResponse<AuthResponse>,
      { status: 200 }
    )

    // Set auth cookie
    await setAuthCookie(token)

    return response
  } catch (error) {
    console.error('[v0] Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' } as ApiResponse,
      { status: 500 }
    )
  }
}
