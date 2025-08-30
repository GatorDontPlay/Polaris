// Manual redirect script - paste this in browser console if login hangs
console.log('🔧 Manual redirect script loaded')

// Check if user is logged in
const checkAuth = () => {
  // Get current URL
  const currentUrl = window.location.pathname
  console.log('Current URL:', currentUrl)
  
  // If on login page, redirect to dashboard
  if (currentUrl === '/login' || currentUrl === '/') {
    console.log('🚀 Manually redirecting to dashboard...')
    window.location.href = '/dashboard'
  } else {
    console.log('Not on login page, no redirect needed')
  }
}

// Run the check
checkAuth()

// Also create a global function for manual use
window.forceRedirect = () => {
  console.log('🚀 Force redirecting to dashboard...')
  window.location.href = '/dashboard'
}

console.log('💡 If still stuck, type: window.forceRedirect()')
