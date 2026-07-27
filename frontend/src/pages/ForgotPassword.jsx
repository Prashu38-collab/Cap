import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/forgot-password.css'
import {
  FaEnvelope,
  FaLock,
  FaKey,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa'

const OTP_LENGTH = 4
const DEFAULT_EMAIL = 'jane.doe@example.com'
const INITIAL_TIMER = 45

function getPasswordStrength(password) {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return { label: 'Weak', color: '#DC2626', score }
  if (score === 2) return { label: 'Fair', color: '#F59E0B', score }
  if (score === 3) return { label: 'Good', color: '#22C55E', score }
  return { label: 'Strong', color: '#16A34A', score }
}

function OtpInputGroup({ values, onChange, onKeyDown, onPaste, disabled }) {
  return (
    <div className="otp-grid" onPaste={onPaste}>
      {values.map((value, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          className="otp-input"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  )
}

function PasswordField({ label, value, onChange, show, onToggle, error }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="password-input-wrapper">
        <input
          type={show ? 'text' : 'password'}
          className="text-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
        />
        <button type="button" className="icon-button" onClick={onToggle} aria-label="Toggle password visibility">
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const [timer, setTimer] = useState(INITIAL_TIMER)
  const [otpError, setOtpError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const otpRefs = useRef([])

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword])
  const sampleOtp = ['1', '2', '3', '4']
  const resendEnabled = timer === 0

  useEffect(() => {
    if (timer <= 0) return undefined
    const interval = window.setInterval(() => setTimer((current) => Math.max(current - 1, 0)), 1000)
    return () => window.clearInterval(interval)
  }, [timer])

  useEffect(() => {
    if (currentStep === 2) {
      setOtp(sampleOtp)
      setOtpError('')
    }
  }, [currentStep])

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '')
    if (!digit && value !== '') return
    setOtp((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus()
    }
  }

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (event) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    pasted.split('').forEach((digit, idx) => {
      next[idx] = digit
    })
    setOtp(next)
    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    otpRefs.current[nextIndex]?.focus()
  }

  const handleContinue = () => {
    const value = otp.join('')
    if (value.length < OTP_LENGTH) {
      setOtpError('Enter all 4 digits to continue.')
      return
    }
    setOtpError('')
    setCurrentStep(2)
  }

  const handleVerifyOtp = () => {
    const value = otp.join('')
    if (value.length < OTP_LENGTH) {
      setOtpError('Please enter the 4-digit OTP.')
      return
    }
    setOtpError('')
    setCurrentStep(3)
  }

  const handleResetPassword = () => {
    let hasError = false
    setPasswordError('')
    setConfirmError('')

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      hasError = true
    }
    if (confirmPassword !== newPassword) {
      setConfirmError('Passwords do not match.')
      hasError = true
    }
    if (hasError) return

    setPasswordError('')
    setConfirmError('')
    setCurrentStep(1)
    setOtp(Array(OTP_LENGTH).fill(''))
    setNewPassword('')
    setConfirmPassword('')
    setTimer(INITIAL_TIMER)
    window.alert('Your password has been reset successfully.')
  }

  const handleResend = () => {
    if (!resendEnabled) return
    setTimer(INITIAL_TIMER)
    setOtp(Array(OTP_LENGTH).fill(''))
    setOtpError('')
  }

  const renderHeader = (icon, title, description) => (
    <div className="card-header">
      <div className="icon-circle">{icon}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  )

  const renderFooterLink = () => (
    <div className="footer-link">
      <Link to="/login">Back to login</Link>
    </div>
  )

  return (
    <div className="forgot-password-page">
      <div className="forgot-card">
        {currentStep === 1 && (
          <>
            {renderHeader(<FaEnvelope size={28} />, 'Check Your Email', (
              <>
                We&apos;ve sent a 4-digit OTP to <span className="email-tag">{DEFAULT_EMAIL}</span>.
                <br />Please enter the OTP below to reset your password.
              </>
            ))}
            <OtpInputGroup
              values={otp}
              onChange={handleOtpChange}
              onKeyDown={handleOtpKeyDown}
              onPaste={handleOtpPaste}
              disabled={false}
            />
            {otpError && <p className="error-text">{otpError}</p>}
            <button className="primary-button" type="button" onClick={handleContinue}>
              Continue
            </button>
            <div className="resend-row">
              <span>Didn&apos;t receive the code? </span>
              <button className="text-button" type="button" onClick={handleResend} disabled={!resendEnabled}>
                Resend OTP
              </button>
              <span className="timer">({timer.toString().padStart(2, '0')}s)</span>
            </div>
            {renderFooterLink()}
          </>
        )}

        {currentStep === 2 && (
          <>
            {renderHeader(<FaLock size={28} />, 'Enter OTP', (
              <>
                Enter the 4-digit code sent to <span className="email-tag">{DEFAULT_EMAIL}</span>.
              </>
            ))}
            <OtpInputGroup
              values={sampleOtp}
              onChange={() => {} }
              onKeyDown={() => {} }
              onPaste={() => {} }
              disabled={true}
            />
            <button className="primary-button" type="button" onClick={handleVerifyOtp}>
              VERIFY OTP
            </button>
            <div className="resend-row">
              <span>Didn&apos;t receive the code? </span>
              <button className="text-button" type="button" onClick={handleResend} disabled={!resendEnabled}>
                Resend OTP
              </button>
              <span className="timer">({timer.toString().padStart(2, '0')}s)</span>
            </div>
            {renderFooterLink()}
          </>
        )}

        {currentStep === 3 && (
          <>
            {renderHeader(<FaKey size={28} />, 'Reset Password', 'Enter and confirm your new password.')}
            <PasswordField
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              show={passwordVisible}
              onToggle={() => setPasswordVisible((current) => !current)}
              error={passwordError}
            />
            <div className="strength-row">
              <div className="strength-bars">
                {[1, 2, 3, 4].map((bar) => (
                  <span
                    key={bar}
                    className={`strength-bar ${passwordStrength.score >= bar ? 'filled' : ''}`}
                    style={{ backgroundColor: passwordStrength.score >= bar ? passwordStrength.color : '#E5E7EB' }}
                  />
                ))}
              </div>
              <span className="strength-label" style={{ color: passwordStrength.color }}>
                {newPassword ? passwordStrength.label : 'Enter a password'}
              </span>
            </div>
            <PasswordField
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={confirmVisible}
              onToggle={() => setConfirmVisible((current) => !current)}
              error={confirmError}
            />
            <button className="primary-button" type="button" onClick={handleResetPassword}>
              RESET PASSWORD
            </button>
            {renderFooterLink()}
          </>
        )}
      </div>
    </div>
  )
}
