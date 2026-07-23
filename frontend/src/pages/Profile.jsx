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
import { listSavedItineraries, updateSavedItinerary, deleteSavedItinerary } from '../utils/api'
import { logoutUser } from '../utils/authStorage'

const sampleImage = '/images/kathmandu.png'

export default function MyProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState({
    fullName: 'Keonho Lee',
    email: 'keonholee@gmail.com',
    phone: '982848189',
    address: 'Busan, South Korea',
    joined: 'Jan 2026'
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
        phone: currentUser.phone || prev.phone,
        address: currentUser.address || prev.address,
        joined: currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : prev.joined,
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
      <section className="profile-hero">
        <img src="/images/contactus.png" alt="Boudhanath Stupa Nepal" className="profile-hero-image" />
        <div className="profile-hero-overlay" />
        <div className="profile-hero-copy">
          <h1 className="hero-title">Every Journey Tells a Story</h1>
          <p className="hero-quote">"Travel isn't always about the destination, it's about the memories you create along the way."</p>
        </div>
      </section>
      <main className="profile-main">
        <section id="profile-card" className="profile-card">
          <div className="profile-card-info">
            <h2>Personal Information</h2>
            <div className="profile-detail-grid">
              <div className="profile-detail-row">
                <FaUser className="detail-icon" />
                <span className="detail-label">Full Name</span>
                {isEditing ? (
                  <input className="profile-detail-input" value={profile.fullName} onChange={e => handleInputChange('fullName', e.target.value)} />
                ) : (
                  <span className="profile-detail-value">{profile.fullName}</span>
                )}
              </div>
              <div className="profile-detail-row">
                <FaEnvelope className="detail-icon" />
                <span className="detail-label">Email</span>
                {isEditing ? (
                  <input className="profile-detail-input" value={profile.email} onChange={e => handleInputChange('email', e.target.value)} />
                ) : (
                  <span className="profile-detail-value">{profile.email}</span>
                )}
              </div>
              <div className="profile-detail-row">
                <FaPhone className="detail-icon" />
                <span className="detail-label">Phone</span>
                {isEditing ? (
                  <input className="profile-detail-input" value={profile.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                ) : (
                  <span className="profile-detail-value">{profile.phone}</span>
                )}
              </div>
              <div className="profile-detail-row">
                <FaMapMarkerAlt className="detail-icon" />
                <span className="detail-label">Address</span>
                {isEditing ? (
                  <input className="profile-detail-input" value={profile.address} onChange={e => handleInputChange('address', e.target.value)} />
                ) : (
                  <span className="profile-detail-value">{profile.address}</span>
                )}
              </div>
              <div className="profile-detail-row">
                <FaRegCalendarAlt className="detail-icon" />
                <span className="detail-label">Date Joined</span>
                <span className="profile-detail-value">{profile.joined}</span>
              </div>
            </div>

            {showPasswordChange && (
              <div className="password-change-panel">
                <h3 className="password-panel-title">Change Password</h3>
                <div className="password-field-row">
                  <label className="password-label" htmlFor="new-password">New Password</label>
                  <input
                    id="new-password"
                    className="profile-detail-input"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={e => handlePasswordFieldChange('newPassword', e.target.value)}
                  />
                </div>
                <div className="password-field-row">
                  <label className="password-label" htmlFor="confirm-password">Confirm Password</label>
                  <input
                    id="confirm-password"
                    className="profile-detail-input"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={e => handlePasswordFieldChange('confirmPassword', e.target.value)}
                  />
                </div>
                <div className="profile-button-row compact-actions">
                  <button className="profile-action-btn edit-btn" type="button" onClick={handlePasswordSave}>
                    <FaLock /> Save Password
                  </button>
                </div>
              </div>
            )}

            <div className="profile-button-row compact-actions">
              {isEditing ? (
                <>
                  <button className="profile-action-btn edit-btn" type="button" onClick={handleEditProfile}>
                    <FaSave /> Save Profile
                  </button>
                  <button
                    className="profile-action-btn cancel-btn"
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setShowPasswordChange(false)
                      setPasswordForm({ newPassword: '', confirmPassword: '' })
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="profile-action-btn edit-btn" type="button" onClick={handleEditProfile}>
                    <FaEdit /> Edit Profile
                  </button>
                  <button className="profile-action-btn delete-btn" type="button" onClick={handleDeleteAccount}>
                    <FaTrash /> Delete Account
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="profile-section">
          <h2>Saved Itineraries</h2>
          <div className="dest-grid">
            {savedItineraries.length === 0 ? (
              <div className="empty-state">No saved itineraries yet. Generate one from the planner to see it here.</div>
            ) : savedItineraries.map(item => (
              <article className="destination-card" key={item.id}>
                <div className="dest-img-wrapper">
                  <img src={sampleImage} alt={item.title} />
                  <button className="heart-btn" type="button" aria-label="Favorite"><FaHeart /></button>
                </div>
                <div className="destination-content">
                  {editingId === item.id ? (
                    <>
                      <input className="profile-detail-input" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
                      <textarea className="profile-detail-input" value={draftSummary} onChange={(e) => setDraftSummary(e.target.value)} style={{ marginTop: 8, minHeight: 72 }} />
                      <div className="profile-button-row" style={{ marginTop: 8 }}>
                        <button className="profile-action-btn edit-btn" type="button" onClick={() => saveEdit(item.id)}><FaSave /> Save</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>{item.title}</h3>
                      <p>{item.destination}</p>
                      <p className="saved-itinerary-meta">{item.summary}</p>
                      <p className="saved-itinerary-meta">Saved: {item.createdAt}</p>
                      <div className="profile-button-row" style={{ marginTop: 8 }}>
                        <button className="profile-action-btn edit-btn" type="button" onClick={() => startEditing(item)}><FaEdit /> Edit</button>
                        <button className="profile-action-btn cancel-btn" type="button" onClick={() => deleteItinerary(item.id)}><FaTrash /> Delete</button>
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