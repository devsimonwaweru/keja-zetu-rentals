// src/components/InstallPrompt.jsx
import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Listen for the 'beforeinstallprompt' event
    const handleBeforeInstall = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      // Show our custom modal
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Cleanup listener
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the browser install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to the install prompt: ${outcome}`)
    
    // We've used the prompt, and can't use it again, clear it
    setDeferredPrompt(null)
    // Hide our custom modal
    setShowPrompt(false)
  }

  const handleClose = () => {
    setShowPrompt(false)
    // Optional: You could set a localStorage item here to not annoy users again for X days
  }

  if (!showPrompt) return null

  return (
    <div className="install-overlay">
      <div className="install-modal">
        <button className="install-close" onClick={handleClose}>
          <X size={20} />
        </button>
        
        <div className="install-icon">
          <Smartphone size={48} strokeWidth={1.5} />
        </div>

        <h3>Install keja-zetu App</h3>
        <p style={{ color: 'var(--text-subtle)', marginBottom: '24px', lineHeight: '1.5' }}>
          Install this application on your home-screen for a better experience and quick access.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-outline" 
            onClick={handleClose}
            style={{ flex: 1 }}
          >
            Not Now
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleInstallClick}
            style={{ flex: 1, background: 'var(--primary-blue)' }}
          >
            <Download size={18} />
            Install
          </button>
        </div>
      </div>
    </div>
  )
}