// Check Supabase configuration and suggest fixes
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Read environment variables from .env.local
let supabaseUrl, supabaseServiceKey

try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const envLines = envContent.split('\n')
  
  for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].replace(/"/g, '')
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].replace(/"/g, '')
    }
  }
} catch (error) {
  console.error('❌ Could not read .env.local file')
  process.exit(1)
}

console.log('🔍 Supabase Configuration Check\n')

console.log('📋 Current Configuration:')
console.log(`   Supabase URL: ${supabaseUrl}`)
console.log(`   Project ID: ${supabaseUrl.split('//')[1].split('.')[0]}`)

console.log('\n📋 Required Supabase Auth Settings:')
console.log('   Go to: https://supabase.com/dashboard/project/qekkojxnjllmhdjywyrv/auth/url-configuration')
console.log('')
console.log('   ✅ Site URL should be: http://localhost:3000')
console.log('   ✅ Redirect URLs should include:')
console.log('      - http://localhost:3000/auth/confirm')
console.log('      - http://localhost:3000/auth/reset-password')
console.log('      - http://localhost:3000/**')

console.log('\n📋 Email Template Settings:')
console.log('   Go to: https://supabase.com/dashboard/project/qekkojxnjllmhdjywyrv/auth/templates')
console.log('')
console.log('   ✅ Confirm signup template should have:')
console.log('      - Confirmation URL: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email')
console.log('')
console.log('   ✅ Reset password template should have:')
console.log('      - Reset URL: {{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery')

console.log('\n🔧 If emails are failing, check that:')
console.log('   1. Site URL is exactly: http://localhost:3000')
console.log('   2. Email templates use the correct URLs above')
console.log('   3. Redirect URLs include your confirmation URLs')
console.log('   4. The email link hasn\'t expired (links expire after a certain time)')

process.exit(0)
