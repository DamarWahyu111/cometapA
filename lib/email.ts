import nodemailer from 'nodemailer'

interface SendWelcomeEmailParams {
  to: string
  name: string
  email: string
  password: string
  programName?: string
  appUrl?: string
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
}

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '465', 10)
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '')

  if (!user || !pass) {
    throw new Error('Konfigurasi SMTP (SMTP_USER dan SMTP_PASS) belum diisi di .env.local')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  })
}

export async function sendWelcomeEmail({
  to,
  name,
  email,
  password,
  programName,
  appUrl,
}: SendWelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSmtpConfigured()) {
      return {
        success: false,
        error: 'Kredensial SMTP belum diisi (SMTP_USER & SMTP_PASS)',
      }
    }

    const transporter = getTransporter()
    const fromAddress = process.env.SMTP_FROM || `"Come Tap A - NFC Absensi" <${process.env.SMTP_USER}>`
    const loginUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/auth/login'

    const letterDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Informasi Akun Sistem Absensi Come Tap A</title>
      <style>
        body { font-family: Georgia, 'Times New Roman', serif; background-color: #e8e4dc; color: #1a1a1a; margin: 0; padding: 32px 16px; }
        .envelope-wrap { max-width: 580px; margin: 0 auto; }
        .envelope-top { background: #c9a96e; height: 8px; border-radius: 6px 6px 0 0; }
        .paper { background: #fffdf7; border: 1px solid #d4c89a; box-shadow: 0 6px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08); padding: 48px 44px; position: relative; }
        .paper::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #c9a96e, #e8d5a3, #c9a96e); }
        .letterhead { text-align: center; border-bottom: 2px solid #c9a96e; padding-bottom: 20px; margin-bottom: 28px; }
        .letterhead-title { font-size: 20px; font-weight: bold; color: #1a1a1a; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 4px; font-family: Georgia, serif; }
        .letterhead-sub { font-size: 12px; color: #7a6a4a; letter-spacing: 1px; text-transform: uppercase; margin: 0; font-family: Arial, sans-serif; }
        .letterhead-line { width: 60px; height: 1px; background: #c9a96e; margin: 10px auto 0; }
        .date { font-size: 13px; color: #5a4a30; text-align: right; margin-bottom: 24px; font-family: Arial, sans-serif; }
        .salutation { font-size: 15px; margin-bottom: 16px; color: #1a1a1a; }
        .body-text { font-size: 14px; line-height: 1.8; color: #2a2a2a; margin-bottom: 16px; font-family: Arial, sans-serif; }
        .credentials-box { background: #fdf8ee; border: 1px solid #c9a96e; border-left: 4px solid #c9a96e; border-radius: 4px; padding: 20px 24px; margin: 28px 0; }
        .cred-title { font-size: 12px; font-weight: bold; color: #7a6a4a; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 16px; font-family: Arial, sans-serif; }
        .cred-row { display: flex; align-items: baseline; margin-bottom: 10px; font-family: Arial, sans-serif; font-size: 14px; }
        .cred-label { color: #5a4a30; min-width: 90px; font-weight: 600; }
        .cred-sep { color: #c9a96e; margin: 0 8px; }
        .cred-value-email { color: #1a1a1a; font-weight: 600; }
        .cred-value-pass { background: #1a1a1a; color: #fffdf7; padding: 2px 10px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; letter-spacing: 1px; }
        .btn-wrapper { text-align: center; margin: 32px 0 24px; }
        .btn { display: inline-block; background: #1a1a1a; color: #fffdf7 !important; text-decoration: none; padding: 12px 32px; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
        .closing { font-size: 14px; line-height: 1.8; color: #2a2a2a; margin-top: 28px; padding-top: 20px; border-top: 1px dashed #c9a96e; font-family: Arial, sans-serif; }
        .signature { margin-top: 28px; }
        .sig-title { font-size: 13px; color: #7a6a4a; font-style: italic; }
        .sig-name { font-size: 15px; font-weight: bold; color: #1a1a1a; margin-top: 4px; font-family: Georgia, serif; }
        .sig-org { font-size: 12px; color: #7a6a4a; font-family: Arial, sans-serif; letter-spacing: 0.5px; }
        .footer-strip { background: #c9a96e; height: 6px; border-radius: 0 0 4px 4px; }
      </style>
    </head>
    <body>
      <div class="envelope-wrap">
        <div class="envelope-top"></div>
        <div class="paper">
          <div class="letterhead">
            <p class="letterhead-title">Come Tap A</p>
            <div class="letterhead-line"></div>
            <p class="letterhead-sub">Sistem Absensi NFC &mdash; Surat Resmi Akun</p>
          </div>

          <div class="date">${letterDate}</div>

          <div class="salutation">Kepada Yth.,<br><strong>${name}</strong></div>

          <p class="body-text">
            Dengan hormat,<br><br>
            Kami ingin memberitahukan bahwa akun Anda pada <strong>Sistem Absensi NFC Come Tap A</strong> telah berhasil dibuat oleh Administrator${programName ? ` untuk program <strong>${programName}</strong>` : ''}.
          </p>

          <p class="body-text">
            Berikut adalah informasi kredensial login Anda:
          </p>

          <div class="credentials-box">
            <div class="cred-title">&#128274; Kredensial Login</div>
            <div class="cred-row">
              <span class="cred-label">Email</span>
              <span class="cred-sep">:</span>
              <span class="cred-value-email">${email}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Password</span>
              <span class="cred-sep">:</span>
              <span class="cred-value-pass">${password}</span>
            </div>
          </div>

          <div class="btn-wrapper">
            <a href="${loginUrl}" target="_blank" class="btn">Masuk ke Sistem &rarr;</a>
          </div>

          <div class="closing">
            Mohon simpan informasi ini dengan baik dan jangan bagikan kepada siapapun.
            Apabila Anda mengalami kendala dalam proses login atau absensi, silakan hubungi Administrator.
          </div>

          <div class="signature">
            <div class="sig-title">Hormat kami,</div>
            <div class="sig-name">Come Tap A</div>
            <div class="sig-org">Tim Administrasi &mdash; Sistem Absensi NFC</div>
          </div>
        </div>
        <div class="footer-strip"></div>
      </div>
    </body>
    </html>
    `

    await transporter.sendMail({
      from: fromAddress,
      to,
      subject: 'Akun Absensi Come Tap A Anda Telah Dibuat',
      text: `Halo ${name},\n\nAkun Anda telah dibuat untuk sistem absensi Come Tap A.\n\nKredensial Login:\nEmail: ${email}\nPassword: ${password}\n\nSilakan login di: ${loginUrl}\n`,
      html: htmlContent,
    })

    return { success: true }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Gagal mengirim email'
    console.error('[Nodemailer error]:', errorMessage)
    return { success: false, error: errorMessage }
  }
}
