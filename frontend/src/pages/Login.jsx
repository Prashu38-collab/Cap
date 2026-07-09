import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/Login.css'

import axios from "axios";

// import { loginUser, getCurrentUser } from '../utils/authStorage'

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

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [notice, setNotice] = useState(null)
  const noticeTimerRef = useRef(null)
  const redirectTimerRef = useRef(null)
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false);

  const API_URL = "http://localhost:8000/login";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if(token){
      navigate("/dashboard", { replace: true });
    }

    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [navigate])

  function showNotice(type, message) {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    setNotice({ type, message })
    noticeTimerRef.current = setTimeout(() => setNotice(null), 5000)
  }

  function update(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function submit(e) {
    e.preventDefault()

    if (!form.email.trim()) {
      showNotice('error', 'Email is required.')
      return
    }

    if (!form.password.trim()) {
      showNotice('error', 'Password is required.')
      return
    }

    try {

      const response = await axios.post(API_URL,
        {
          email: form.email,
          password: form.password
        }
      );

      if (response.data.user.status === "Inactive") {
        showNotice(
          "error",
          "Your account is inactive. Please verify your email."
        );
        return;
      }

      if (response.data.user.status === "Locked") {
        showNotice(
          "error",
          "Your account has been locked. Please contact the administrator."
        );
        return;
      }

      localStorage.setItem("token", response.data.access_token);

      localStorage.setItem("user", JSON.stringify(response.data.user));

      showNotice("success", "Login successful.");

      if (redirectTimerRef.current)
        clearTimeout(redirectTimerRef.current);

      redirectTimerRef.current = setTimeout(() => {
        navigate("/dashboard");
      }, 800);

    }

    catch(error){
      if(error.response){
        showNotice("error", error.response.data.detail);
      }

      else{
        showNotice("error", "Unable to connect to server.");
      }
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <img src="/images/login.png" alt="Login illustration" />
      </div>
      <div className="auth-right">
        <div className="card">
          <h2>Log In</h2>
          <form onSubmit={submit} className="form">
            <input name="email" placeholder="Email" value={form.email} onChange={update} />

            <div className="password-wrapper">
              <input name="password" type={showPassword ? "text" : "password"} placeholder="Password" value={form.password} onChange={update} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {/* <input name="password" type="password" placeholder="Password" value={form.password} onChange={update} /> */}
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
            <span><a href="#">Forgot Password?</a></span>
          </div>
        </div>
      </div>
    </div>
  )
}
