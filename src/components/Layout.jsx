import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { MenuIcon } from './Icons'
import './Layout.css'

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      // On desktop, always keep sidebar open
      if (!mobile) {
        setSidebarOpen(true)
      }
    }

    // Set initial state
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    // Only allow closing on mobile
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="layout">
      {/* Mobile menu toggle button */}
      {isMobile && (
        <button 
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <MenuIcon />
        </button>
      )}

      <div className="layout-container">
        <Sidebar isOpen={sidebarOpen || !isMobile} onClose={closeSidebar} />
        
        <main className="layout-main">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout

