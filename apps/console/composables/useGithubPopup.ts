export const useGithubPopup = () => {
  const config = useRuntimeConfig()
  const user = useSupabaseUser()
  
  const openInstallationPopup = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const githubApp = config.public.GITHUB_APP
      const redirectUri = `${window.location.origin}/oauth`
      const url = `https://github.com/apps/${githubApp}/installations/new?redirect_uri=${redirectUri}`
      
      const popup = window.open(url, 'github-install', 'width=600,height=700,scrollbars=yes,resizable=yes')
      
      if (!popup) {
        reject(new Error('Popup blocked'))
        return
      }
      
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'GITHUB_INSTALLATION_SUCCESS') {
          window.removeEventListener('message', messageHandler)
          clearInterval(checkClosed)
          popup?.close()
          resolve(event.data.data)
        }
      }
      
      window.addEventListener('message', messageHandler)
      
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageHandler)
          reject(new Error('Installation cancelled'))
        }
      }, 1000)
    })
  }
  
  const openOAuthPopup = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const githubClientId = config.public.GITHUB_CLIENT_ID
      const redirectUri = `${window.location.origin}/oauth`
      const state = Math.random().toString(36).substring(7)
      const scope = 'user'
      const login = user.value?.user_metadata?.user_name
      
      const url = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&state=${state}&scope=${scope}&login=${login}&allow_signup=false&redirect_uri=${redirectUri}`
      
      const popup = window.open(url, 'github-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes')
      
      if (!popup) {
        reject(new Error('Popup blocked'))
        return
      }
      
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'GITHUB_OAUTH_SUCCESS') {
          window.removeEventListener('message', messageHandler)
          clearInterval(checkClosed)
          popup?.close()
          resolve(event.data.data)
        }
      }
      
      window.addEventListener('message', messageHandler)
      
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageHandler)
          reject(new Error('OAuth cancelled'))
        }
      }, 1000)
    })
  }
  
  return {
    openInstallationPopup,
    openOAuthPopup
  }
}
