// pages/MyProfile.jsx
import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useNavigate } from 'react-router-dom'
import '../styles/profile.css'
import {
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaRegCalendarAlt,
  FaUser,
  FaEdit,
  FaLock,
  FaHeart,
  FaTrash,
  FaSave
} from 'react-icons/fa'
// import { listSavedItineraries, updateSavedItinerary, deleteSavedItinerary } from '../utils/api'
// import { logoutUser } from '../utils/authStorage'

const sampleImage = '/images/kathmandu.png'

export default function MyProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState({
    fullName: 'Keonho Lee',
    email: 'keonholee@gmail.com',
    phone: '982848189'
  })
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' })
  const [savedItineraries, setSavedItineraries] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftSummary, setDraftSummary] = useState('')

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
    if (currentUser) {
      setProfile(prev => ({
        ...prev,
        fullName: currentUser.name || prev.fullName,
        email: currentUser.email || prev.email,
        phone: currentUser.phone_number || prev.phone,
      }))
    }

    const stored = JSON.parse(localStorage.getItem('savedItineraries') || '[]')
    setSavedItineraries(stored)

    const loadSavedItineraries = async () => {
      try {
        const response = await listSavedItineraries()
        const next = (response.itineraries || []).map(item => ({
          id: item.itinerary_id,
          title: item.itinerary_data?.title || `Trip #${item.itinerary_id}`,
          destination: item.itinerary_data?.destination || 'Saved itinerary',
          summary: item.itinerary_data?.summary || item.status || 'Saved itinerary',
          createdAt: item.generated_at || 'Recently saved',
          itinerary: item.itinerary_data?.itinerary || [],
          notes: item.itinerary_data?.notes || '',
        }))
        setSavedItineraries(next)
        localStorage.setItem('savedItineraries', JSON.stringify(next))
      } catch (error) {
        console.error('Unable to load saved itineraries', error)
      }
    }

    loadSavedItineraries()
  }, [])

  function handleDeleteAccount() {
    const confirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.')
    if (!confirmed) return

    logoutUser()
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('savedItineraries')
    sessionStorage.clear()
    navigate('/login', { replace: true })
  }

  function handleEditProfile() {
    if (isEditing) {
      setIsEditing(false)
      setShowPasswordChange(false)
      setPasswordForm({ newPassword: '', confirmPassword: '' })
    } else {
      setIsEditing(true)
      setShowPasswordChange(true)
    }
  }

  function handleInputChange(field, value) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  function handlePasswordFieldChange(field, value) {
    setPasswordForm(prev => ({ ...prev, [field]: value }))
  }

  function handlePasswordSave() {
    if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) {
      window.alert('Please make sure the new password and confirm password match.')
      return
    }

    window.alert('Password updated successfully')
    setPasswordForm({ newPassword: '', confirmPassword: '' })
    setShowPasswordChange(false)
    setIsEditing(false)
  }

  function saveItineraryToProfile(itinerary) {
    const clone = {
      id: Date.now(),
      title: itinerary.title || 'Saved Trip',
      destination: itinerary.destination || 'Custom route',
      summary: itinerary.summary || 'Your generated itinerary is ready.',
      createdAt: new Date().toLocaleString(),
      itinerary: itinerary.itinerary || [],
      notes: itinerary.notes || ''
    }
    const next = [clone, ...savedItineraries]
    setSavedItineraries(next)
    localStorage.setItem('savedItineraries', JSON.stringify(next))
  }

  useEffect(() => {
    const handler = (event) => {
      if (event.detail?.itinerary) {
        saveItineraryToProfile(event.detail.itinerary)
      }
    }
    window.addEventListener('saved-itinerary', handler)
    return () => window.removeEventListener('saved-itinerary', handler)
  }, [savedItineraries])

  function startEditing(itinerary) {
    setEditingId(itinerary.id)
    setDraftName(itinerary.title)
    setDraftSummary(itinerary.summary)
  }

  async function saveEdit(id) {
    const next = savedItineraries.map(entry => entry.id === id ? {
      ...entry,
      title: draftName || entry.title,
      summary: draftSummary || entry.summary
    } : entry)
    const entry = next.find(item => item.id === id)
    setSavedItineraries(next)
    localStorage.setItem('savedItineraries', JSON.stringify(next))
    try {
      await updateSavedItinerary(id, {
        itinerary_data: {
          title: entry.title,
          destination: entry.destination,
          summary: entry.summary,
          itinerary: entry.itinerary,
          notes: entry.notes,
        }
      })
    } catch (error) {
      console.error('Unable to update itinerary', error)
    }
    setEditingId(null)
  }

  async function deleteItinerary(id) {
    const next = savedItineraries.filter(entry => entry.id !== id)
    setSavedItineraries(next)
    localStorage.setItem('savedItineraries', JSON.stringify(next))
    try {
      await deleteSavedItinerary(id)
    } catch (error) {
      console.error('Unable to delete itinerary', error)
    }
  }

  return (
    <div className="profile-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="profile-hero">
        <img src="/images/contactus.png" alt="Boudhanath Stupa Nepal" className="profile-hero-image" />
        <div className="profile-hero-overlay" />
        <div className="profile-hero-copy">
          <h1 className="profile-hero-title">Every Journey Tells a Story</h1>
          <p className="profile-hero-quote">"Travel isn't always about the destination, it's about the memories you create along the way."</p>
        </div>
      </section>

      <main className="profile-main">
        {/* Profile Card */}
        <section className="profile-card">
          <div className="profile-card-info">
            <h2>Personal Information</h2>
            <div className="profile-detail-grid">
              <div className="profile-detail-row">
                <FaUser className="profile-detail-icon" />
                <span className="profile-detail-label">Full Name</span>
                {isEditing ? (
                  <input className="profile-detail-input" value={profile.fullName} onChange={e => handleInputChange('fullName', e.target.value)} />
                ) : (
                  <span className="profile-detail-value">{profile.fullName}</span>
                )}
              </div>
              <div className="profile-detail-row">
                <FaEnvelope className="profile-detail-icon" />
                <span className="profile-detail-label">Email Address</span>
                <span className="profile-detail-value">{profile.email}</span>
              </div>
              <div className="profile-detail-row">
                <FaPhone className="profile-detail-icon" />
                <span className="profile-detail-label">Phone Number</span>
                {isEditing ? (
                  <input className="profile-detail-input" value={profile.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                ) : (
                  <span className="profile-detail-value">{profile.phone}</span>
                )}
              </div>
            </div>

            {/* Password Change Panel */}
            {showPasswordChange && (
              <div className="profile-password-panel">
                <h3 className="profile-password-title">Change Password</h3>
                <div className="profile-password-field">
                  <label className="profile-password-label" htmlFor="new-password">New Password</label>
                  <input
                    id="new-password"
                    className="profile-detail-input"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={e => handlePasswordFieldChange('newPassword', e.target.value)}
                  />
                </div>
                <div className="profile-password-field">
                  <label className="profile-password-label" htmlFor="confirm-password">Confirm Password</label>
                  <input
                    id="confirm-password"
                    className="profile-detail-input"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={e => handlePasswordFieldChange('confirmPassword', e.target.value)}
                  />
                </div>
                <div className="profile-button-row">
                  <button className="profile-btn profile-btn-save-password" type="button" onClick={handlePasswordSave}>
                    <FaLock /> Save Password
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="profile-button-row">
              {isEditing ? (
                <>
                <div className="end-btn">
                  <button className="profile-btn profile-btn-edit" type="button" onClick={handleEditProfile}>
                    <FaSave /> Save Profile
                  </button>
                  <button
                    className="profile-btn profile-btn-cancel"
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setShowPasswordChange(false)
                      setPasswordForm({ newPassword: '', confirmPassword: '' })
                    }}
                  >
                    Cancel
                  </button>
                  </div>
                </>
              ) : (
                <>
                  <button className="profile-btn profile-btn-edit" type="button" onClick={handleEditProfile}>
                    <FaEdit /> Edit Profile
                  </button>
                  <button className="profile-btn profile-btn-delete" type="button" onClick={handleDeleteAccount}>
                    <FaTrash /> Delete Account
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Saved Itineraries */}
        <section className="profile-section">
          <h2>Saved Itineraries</h2>
          <div className="profile-dest-grid">
            {savedItineraries.length === 0 ? (
              <div className="profile-empty-state">No saved itineraries yet. Generate one from the planner and save it to see it here.</div>
            ) : savedItineraries.map(item => (
              <article className="profile-dest-card" key={item.id}>
                <div className="profile-dest-img-wrapper">
                  <img src={sampleImage} alt={item.title} />
                  <button className="profile-heart-btn" type="button" aria-label="Favorite"><FaHeart /></button>
                </div>
                <div className="profile-dest-content">
                  {editingId === item.id ? (
                    <>
                      <input className="profile-detail-input" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
                      <textarea className="profile-detail-input" value={draftSummary} onChange={(e) => setDraftSummary(e.target.value)} style={{ marginTop: 8, minHeight: 72 }} />
                      <div className="profile-button-row" style={{ marginTop: 8 }}>
                        <button className="profile-btn profile-btn-edit" type="button" onClick={() => saveEdit(item.id)}><FaSave /> Save</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>{item.title}</h3>
                      <p>{item.destination}</p>
                      <p className="profile-saved-meta">{item.summary}</p>
                      <p className="profile-saved-meta">Saved: {item.createdAt}</p>
                      <div className="profile-button-row" style={{ marginTop: 8 }}>
                        <button className="profile-btn profile-btn-edit" type="button" onClick={() => startEditing(item)}><FaEdit /> Edit</button>
                        <button className="profile-btn profile-btn-delete" type="button" onClick={() => deleteItinerary(item.id)}><FaTrash /> Delete</button>
                      </div>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}