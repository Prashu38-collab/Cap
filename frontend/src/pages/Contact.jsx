import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/contact.css'
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

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

      {/* <section className="contact-hero" aria-label="Contact hero">
        <img src="images/contactus.png" alt="Mountain landscape with prayer flags" className="contact-hero-image" />
        <a className="contact-hero-button" href="#contact-form">Contact Us</a>
      </section> */}

      <section className="contact-content">
        <div className="contact-heading">
          <h1>Contact Us</h1>
          <p>Get in touch with Go Travel</p>
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
      </section>

      < Footer/>
    </div>
  )
}