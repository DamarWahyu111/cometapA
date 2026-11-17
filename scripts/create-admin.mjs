// Script to create or promote an admin user
// Run with: node scripts/create-admin.mjs <email> <password> <name>
// Example: node scripts/create-admin.mjs admin@gmail.com Admin123! "Administrator"

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local tidak ditemukan!')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const [k, ...v] = trimmed.split('=')
  env[k.trim()] = v.join('=').trim()
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const salt = env.SALT || 'default-salt'

if (!supabaseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local!')
  process.exit(1)
}

const email = process.argv[2]
const password = process.argv[3]
const name = process.argv[4] || 'Admin Come Tap A'

if (!email || !password) {
  console.log(`
Penggunaan:
  node scripts/create-admin.mjs <email> <password> [nama]

Contoh:
  node scripts/create-admin.mjs admin@gmail.com Admin123! "Super Admin"
  `)
  process.exit(0)
}

// Hash password with SHA-256 + salt
const hashedPassword = crypto.createHash('sha256').update(password + salt).digest('hex')
const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  console.log(`Menyiapkan akun admin: ${email}...`)

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existingUser) {
    console.log(`Email ${email} sudah terdaftar. Mengubah role menjadi 'admin' dan memperbarui password...`)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        role: 'admin',
        password: hashedPassword,
        name,
      })
      .eq('id', existingUser.id)

    if (updateError) {
      console.error('Gagal memperbarui admin:', updateError)
    } else {
      console.log('✅ Berhasil! Pengguna di-promote menjadi ADMIN.')
    }
    return
  }

  // Create new user with role admin
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        name,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: 'admin',
      },
    ])
    .select('id, name, email, role')
    .single()

  if (insertError) {
    console.error('❌ Gagal membuat akun admin:', insertError)
  } else {
    console.log('✅ Akun Admin berhasil dibuat!')
    console.log('Detail:', newUser)
    console.log(`Silakan login di web dengan email: ${email} dan password yang telah Anda masukkan.`)
  }
}

main().catch(console.error)
