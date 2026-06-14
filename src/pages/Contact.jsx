import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/contact.css'
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const contactItems = [
  {
    icon: '📍',
    title: 'Visit Us At',
    detail: 'Naxal, Opposite Hilton',
  },
  {
    icon: '📞',
    title: '9800000000/972568798',
    detail: 'Have any questions?',
  },
  {
    icon: '📧',
    title: 'gotravelnepal@gmail.com',
    detail: 'Email Us',
  },
  {
    icon: '🕗',
    title: 'Sun-Fri : 10:00 AM - 5:00 PM',
    detail: 'Working Hours',
  },
]

// const footerLinks = [
//   { label: 'Dashboard', to: '/dashboard' },
//   { label: 'Plan My Trip', to: '/plan-my-trip' },
//   { label: 'About Us', to: '/about-us' },
//   { label: 'Contact Us', to: '/contact-us' },
//   { label: 'My Profile', to: '/my-profile' },
// ]

export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', remarks: '' })
  const navigate = useNavigate()

  function updateForm(event) {
    const { name, value } = event.target
    setForm(previous => ({ ...previous, [name]: value }))
  }

  function submitForm(event) {
    event.preventDefault()
    alert('Thanks for reaching out. We will get back to you soon.')
  }

  function logout() {
    navigate('/login')
  }

  return (
    <div className="contact-page">
      < Navbar/>  

      <section className="contact-hero" aria-label="Contact hero">
        <img src="images/contactus.png" alt="Mountain landscape with prayer flags" className="contact-hero-image" />
        <a className="contact-hero-button" href="#contact-form">Contact Us</a>
      </section>

      <section className="contact-content">
        <div className="contact-heading">
          <h1>Contact Us</h1>
          <p>Get in touch with Go Travel</p>
        </div>

        <div className="contact-grid">
          <div className="contact-info-list">
            {contactItems.map(item => (
              <div className="contact-info-row" key={item.title}>
                <div className="contact-icon">{item.icon}</div>
                <div className="contact-info-copy">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              </div>
            ))}
          </div>

          <form id="contact-form" className="contact-form" onSubmit={submitForm}>
            <label>
              <span>Name</span>
              <input name="name" value={form.name} onChange={updateForm} />
            </label>
            <label>
              <span>Email</span>
              <input name="email" type="email" value={form.email} onChange={updateForm} />
            </label>
            <label>
              <span>Phone Number</span>
              <input name="phone" value={form.phone} onChange={updateForm} />
            </label>
            <label>
              <span>Subject</span>
              <input name="subject" value={form.subject} onChange={updateForm} />
            </label>
            <label>
              <span>Message</span>
              <input name="message" value={form.message} onChange={updateForm} />
            </label>
            <button type="submit" className="contact-submit">Submit</button>
          </form>
        </div>
      </section>

      < Footer/>
    </div>
  )
}