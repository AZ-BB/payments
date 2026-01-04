import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { MenuIcon, CloseIcon, PaymentsIcon, IncomeIcon, CreditIcon } from './Icons'
import './Sidebar.css'

function Sidebar({ isOpen, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  
  const pages = [
    { id: 1, name: 'المدفوعات', path: '/payments', icon: PaymentsIcon },
    { id: 2, name: 'الإيرادات', path: '/income', icon: IncomeIcon },
    { id: 3, name: 'الخزنة', path: '/credit', icon: CreditIcon },
  ]

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e) => {
        if (window.innerWidth <= 768 && !e.target.closest('.sidebar') && !e.target.closest('.sidebar-toggle')) {
          onClose()
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handlePageClick = (page) => {
    navigate(page.path)
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 768) {
      onClose()
    }
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      
      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2>Menu</h2>
          <button 
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <CloseIcon />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {pages.map((page) => {
              const IconComponent = page.icon
              const isActive = location.pathname === page.path
              return (
                <li key={page.id}>
                  <button
                    type="button"
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => handlePageClick(page)}
                  >
                    {IconComponent && (
                      <span className="sidebar-link-icon">
                        <IconComponent />
                      </span>
                    )}
                    <span className="sidebar-link-text">{page.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-email">{user.email}</span>
            </div>
          )}
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={handleLogout}
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar

