/**
 * Authentication utility for managing user login and registration
 * Stores user data in localStorage with validation
 */

export function loginUser(email, password) {
  try {
    // Retrieve stored users from localStorage
    const users = JSON.parse(localStorage.getItem('users')) || []
    
    // Find user with matching email
    const user = users.find(u => u.email === email)
    
    if (!user) {
      return { ok: false, message: 'User not found. Please sign up first.' }
    }
    
    // Check password (in production, use hashed passwords)
    if (user.password !== password) {
      return { ok: false, message: 'Incorrect password.' }
    }
    
    // Store current logged-in user
    localStorage.setItem('currentUser', JSON.stringify({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address || '',
      createdAt: user.createdAt || ''
    }))
    
    return { ok: true, message: 'Login successful' }
  } catch (error) {
    return { ok: false, message: 'An error occurred. Please try again.' }
  }
}

export function registerUser(userData) {
  try {
    const { name, email, phone, password, confirm } = userData
    
    // Validate passwords match
    if (password !== confirm) {
      return { ok: false, message: 'Passwords do not match.' }
    }
    
    // Retrieve existing users
    const users = JSON.parse(localStorage.getItem('users')) || []
    
    // Check if email already exists
    if (users.some(u => u.email === email)) {
      return { ok: false, message: 'Email already registered.' }
    }
    
    // Add new user
    users.push({
      name,
      email,
      phone,
      password, // Note: In production, HASH the password before storing
      createdAt: new Date().toISOString()
    })
    
    // Save updated users list
    localStorage.setItem('users', JSON.stringify(users))
    
    return { ok: true, message: 'Registration successful' }
  } catch (error) {
    return { ok: false, message: 'An error occurred. Please try again.' }
  }
}

export function logoutUser() {
  localStorage.removeItem('currentUser')
  return { ok: true, message: 'Logged out successfully' }
}

export function updateUserProfile(updatedData) {
  const currentUser = getCurrentUser()
  if (!currentUser) {
    return { ok: false, message: 'No user is currently logged in.' }
  }

  const users = JSON.parse(localStorage.getItem('users')) || []
  const currentIndex = users.findIndex(u => u.email === currentUser.email)

  if (currentIndex === -1) {
    return { ok: false, message: 'User record not found.' }
  }

  const normalizedEmail = updatedData.email.trim().toLowerCase()
  if (normalizedEmail !== currentUser.email && users.some(u => u.email === normalizedEmail)) {
    return { ok: false, message: 'That email is already in use.' }
  }

  const updatedUser = {
    ...users[currentIndex],
    name: updatedData.name.trim(),
    email: normalizedEmail,
    phone: updatedData.phone.trim(),
    address: updatedData.address?.trim() || users[currentIndex].address || '',
    createdAt: users[currentIndex].createdAt || new Date().toISOString()
  }

  users[currentIndex] = updatedUser
  localStorage.setItem('users', JSON.stringify(users))
  localStorage.setItem('currentUser', JSON.stringify({
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    address: updatedUser.address,
    createdAt: updatedUser.createdAt
  }))

  return {
    ok: true,
    message: 'Profile updated successfully.',
    user: {
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      address: updatedUser.address,
      createdAt: updatedUser.createdAt
    }
  }
}

export function getCurrentUser() {
  const user = localStorage.getItem('currentUser')
  return user ? JSON.parse(user) : null
}
