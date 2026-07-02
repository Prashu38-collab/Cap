import React, { useState } from 'react'
import '../styles/contact.css'
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
FaUser,
FaEnvelope,
FaPhone,
FaMapMarkerAlt,
FaFacebook,
FaInstagram
} from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'

export default function ContactUs() {
const [form, setForm] = useState({
name: '',
email: '',
phone: '',
subject: '',
message: ''
})

function updateForm(event) {
const { name, value } = event.target
setForm(previous => ({ ...previous, [name]: value }))
}

function submitForm(event) {
event.preventDefault()
alert('Thanks for reaching out. We will get back to you soon.')
}

return ( 
<div className="contact-page">

  <Navbar />

  <section className="contact-hero">
  <img
    src="/images/contact.jpg"
    alt="Boudhanath Stupa Nepal"
    className="contact-hero-image"
  />

  {/* <div className="contact-hero-overlay" /> */}

  <div className="contact-hero-copy">
    <h1>Contact Us</h1>
  </div>
</section>

  <section className="contact-content">

    <div className="contact-heading">
      <p>Get in touch with Go Travel</p>
    </div>

    <div className="contact-grid">

      <form className="contact-form" onSubmit={submitForm}>

        <label>
          <span>Name</span>
          <div className="input-group">
            <FaUser className="input-icon" />
            <input
              name="name"
              value={form.name}
              onChange={updateForm}
              placeholder="Enter your name"
            />
          </div>
        </label>

        <label>
          <span>Email</span>
          <div className="input-group">
            <FaEnvelope className="input-icon" />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateForm}
              placeholder="Enter your email"
            />
          </div>
        </label>

        <label>
          <span>Phone Number</span>
          <div className="input-group">
            <FaPhone className="input-icon" />
            <input
              name="phone"
              value={form.phone}
              onChange={updateForm}
              placeholder="Enter phone number"
            />
          </div>
        </label>

        <label>
          <span>Subject</span>
          <div className="input-group">
          <input
            name="subject"
            value={form.subject}
            onChange={updateForm}
            placeholder="Enter subject"
          />
          </div>
        </label>

        <label>
          <span>Message</span>
          <textarea
            rows="5"
            name="message"
            value={form.message}
            onChange={updateForm}
            placeholder="Write your message"
          />
        </label>

        <button type="submit" className="contact-submit">
          Send Message
        </button>

      </form>

    </div>

  </section>

  <Footer />

</div>


)
}
