import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/Signup.css'
import { registerUser, getCurrentUser } from '../utils/authStorage'

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M2.5 12s3.5-6.5 9.5-6.5c1 0 1.9.1 2.8.4M21.5 12S18 18.5 12 18.5c-5.9 0-9.5-6.5-9.5-6.5 1-1.8 2.4-3.5 4.2-4.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', agree: false })
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
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  function submit(e) {
    e.preventDefault()

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password.trim() || !form.confirm.trim()) {
      showNotice('error', 'Please fill in all fields.')
      return
    }

    if (!form.email.trim().toLowerCase().endsWith('@gmail.com')) {
      showNotice('error', 'Email must end with @gmail.com.')
      return
    }

    if (form.password.length < 8) {
      showNotice('error', 'Password must be at least 8 characters.')
      return
    }

    if (!form.agree) {
      showNotice('error', 'Please agree to the terms and policy.')
      return
    }

    if (form.password !== form.confirm) {
      showNotice('error', 'Passwords do not match.')
      return
    }

    const result = registerUser(form)

    if (!result.ok) {
      showNotice('error', result.message)
      return
    }

    showNotice('success', 'Signup successful')
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    redirectTimerRef.current = setTimeout(() => navigate('/login'), 900)
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <img src="/images/login.png" alt="Travel illustration" />
      </div>
      <div className="auth-right">
        <div className="card">
          <h2>Let's get Started</h2>
          <form onSubmit={submit} className="form">
            <input name="name" placeholder="Name" value={form.name} onChange={update} />
            <input name="email" placeholder="Email" value={form.email} onChange={update} />
            <input name="phone" placeholder="Phone Number" value={form.phone} onChange={update} />
            <input name="password" type="password" placeholder="Password" value={form.password} onChange={update} />
            <input name="confirm" type="password" placeholder="Confirm Password" value={form.confirm} onChange={update} />
            <label className="checkbox"><input name="agree" type="checkbox" checked={form.agree} onChange={update} /> I agree to the terms & policy</label>
            <button className="btn" type="submit">Sign Up</button>
          </form>
          {notice ? (
            <div className={`toast ${notice.type}`} role="status" aria-live="polite">
              <span className="toast-icon">{notice.type === 'success' ? '✓' : '!'}</span>
              <span className="toast-message">{notice.message}</span>
            </div>
          ) : null}
          <p className="muted">Have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  )
}
