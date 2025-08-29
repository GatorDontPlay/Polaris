import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  // Create redirect link without the secret token
  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  if (token_hash && type) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error && data.user) {
      // Check if this is a new user signup confirmation
      if (type === 'email') {
        // Create profile entry if it doesn't exist
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (!existingProfile) {
          // Extract user metadata
          const metadata = data.user.user_metadata || {}
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email || '',
              first_name: metadata.first_name || '',
              last_name: metadata.last_name || '',
              role: metadata.role || 'EMPLOYEE',
              is_active: true,
            })

          if (profileError) {
            console.error('Error creating profile:', profileError)
            // Continue anyway, profile creation can be retried
          }
        }
      }

      redirectTo.searchParams.delete('next')
      
      // Redirect based on user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'CEO') {
        redirectTo.pathname = '/admin'
      } else {
        redirectTo.pathname = '/dashboard'
      }

      return NextResponse.redirect(redirectTo)
    }
  }

  // return the user to an error page with some instructions
  redirectTo.pathname = '/auth/error'
  return NextResponse.redirect(redirectTo)
}
