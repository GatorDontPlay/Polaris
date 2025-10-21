// Check if profile exists for the user having login issues
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkProfile() {
  console.log('🔍 Checking profile for user: ryan.higginson@codefishstudio.com\n')

  // Find the user
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError.message)
    return
  }

  const user = users.users.find(u => u.email === 'ryan.higginson@codefishstudio.com')
  if (!user) {
    console.log('❌ User not found')
    return
  }

  console.log('✅ User found:')
  console.log(`   ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Metadata role: ${user.user_metadata?.role || 'Not set'}`)
  console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)

  // Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.log('\n❌ Profile not found in database:', profileError.message)
    console.log('\n🔧 Creating profile from user metadata...')
    
    // Create the missing profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || 'Ryan',
        last_name: user.user_metadata?.last_name || 'Higginson',
        role: user.user_metadata?.role || 'EMPLOYEE',
        is_active: true,
      })

    if (insertError) {
      console.error('❌ Error creating profile:', insertError.message)
    } else {
      console.log('✅ Profile created successfully!')
    }
  } else {
    console.log('\n✅ Profile found:')
    console.log(`   Name: ${profile.first_name} ${profile.last_name}`)
    console.log(`   Role: ${profile.role}`)
    console.log(`   Active: ${profile.is_active}`)
  }
}

checkProfile().then(() => {
  console.log('\n🎯 Try logging in again - the redirect should work now!')
  process.exit(0)
}).catch(error => {
  console.error('❌ Check failed:', error.message)
  process.exit(1)
})
