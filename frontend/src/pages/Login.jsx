import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/Login.css'
import { loginUser, getCurrentUser } from '../utils/authStorage'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [notice, setNotice] = useState(null)
  const noticeTimerRef = useRef(null)
  const redirectTimerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (getCurrentUser()) {
      navigate('/dashboard', { replace: true })
    }

    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [navigate])

  function showNotice(type, message) {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    setNotice({ type, message })
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2600)
  }

  function update(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function submit(e) {
    e.preventDefault()

    if (!form.email.trim()) {
      showNotice('error', 'Email is required.')
      return
    }

    if (!form.email.trim().toLowerCase().endsWith('@gmail.com')) {
      showNotice('error', 'Email must end with @gmail.com.')
      return
    }

    if (!form.password.trim()) {
      showNotice('error', 'Password is required.')
      return
    }

    if (form.password.length < 8) {
      showNotice('error', 'Password must be at least 8 characters.')
      return
    }

    const result = loginUser(form.email, form.password)

    if (!result.ok) {
      showNotice('error', result.message)
      return
    }

    showNotice('success', 'Login successful')
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    redirectTimerRef.current = setTimeout(() => navigate('/dashboard'), 900)
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <img src="/images/login2.avif" alt="Login illustration" />
      </div>
      <div className="auth-right">
        <div className="card">
          <h2>Log In</h2>
          <form onSubmit={submit} className="form">
            <input name="email" placeholder="Email" value={form.email} onChange={update} />
            <input name="password" type="password" placeholder="Password" value={form.password} onChange={update} />
            <button className="btn" type="submit">Login</button>
          </form>
          {notice ? (
            <div className={`toast ${notice.type}`} role="status" aria-live="polite">
              <span className="toast-icon">{notice.type === 'success' ? '✓' : '!'}</span>
              <span className="toast-message">{notice.message}</span>
            </div>
          ) : null}
          <div className="row muted">
            <span>Don't have an account? <Link to="/signup">Sign Up</Link></span>
            <span className="divider">•</span>
            <span><Link to="/forgot-password">Forgot Password?</Link></span>
          </div>
        </div>
      </div>
    </div>
  )
}
