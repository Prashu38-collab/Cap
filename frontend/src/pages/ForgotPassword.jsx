import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/Login.css'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)

    function submit(e) {
        e.preventDefault()
        setSubmitted(true)
    }

    return (
        <div className="auth-container">
            <div className="auth-left">
                <img src="/images/login.png" alt="Forgot password illustration" />
            </div>
            <div className="auth-right">
                <div className="card">
                    <h2>Reset Password</h2>
                    <p className="muted" style={{ marginTop: 0 }}>
                        Enter your email and we’ll send a recovery link.
                    </p>
                    <form onSubmit={submit} className="form">
                        <input
                            name="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <button className="btn" type="submit">Send Reset Link</button>
                    </form>
                    {submitted && (
                        <div className="toast success" role="status" aria-live="polite">
                            <span className="toast-icon">✓</span>
                            <span className="toast-message">A reset link request has been prepared for {email || 'your email'}.</span>
                        </div>
                    )}
                    <div className="row muted" style={{ marginTop: 16 }}>
                        <span><Link to="/login">Back to login</Link></span>
                    </div>
                </div>
            </div>
        </div>
    )
}