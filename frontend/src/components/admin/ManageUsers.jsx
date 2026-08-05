import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Swal from "sweetalert2";
import api from "../../utils/api.js";

function UsersSection() {

const [users, setUsers] = useState([]);
const [showAdd, setShowAdd] = useState(false);
const [notice, setNotice] = useState(null)
const noticeTimerRef = useRef(null);
const navigate = useNavigate();

const [newUser, setNewUser] = useState({
name: "",
email: "",
phone_number: "",
password: ""
});

// 
const [search, setSearch] = useState("");
const [currentPage, setCurrentPage] = useState(1);

const usersPerPage = 10;

// Search & Filter
const filteredUsers = users.filter((user) =>
  user.name.toLowerCase().includes(search.toLowerCase()) ||
  user.email.toLowerCase().includes(search.toLowerCase())
);

// Pagination
const indexOfLastUser = currentPage * usersPerPage;
const indexOfFirstUser = indexOfLastUser - usersPerPage;
const currentUsers = filteredUsers.slice(
  indexOfFirstUser,
  indexOfLastUser
);
const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

// Toast
function showNotice(type, message) {
    if (noticeTimerRef.current)
    clearTimeout(noticeTimerRef.current);
    setNotice({type, message });
    noticeTimerRef.current = setTimeout(() => {setNotice(null);}, 5000);
}

useEffect(() => {
  fetchUsers();
}, []);

const fetchUsers = async () => {

  try {
    const response = await api.get("/api/admin/users");
    setUsers(response.data);
  } catch (error) {
    console.error("Error fetching users:", error);
  }

};

const handleInputChange = (e) => {

  const { name, value } = e.target;

  setNewUser({
    ...newUser,
    [name]: value
  });

};

// Add User
const handleAddUser = async () => {

  // Required Fields
  if (
    !newUser.name.trim() ||
    !newUser.email.trim() ||
    !newUser.phone_number.trim() ||
    !newUser.password.trim()
  ) {
    Swal.fire("Error", "Please fill all required fields.", "error");
    return;
  }

  // Name Validation
  if (newUser.name.trim().length < 3) {
    Swal.fire("Error", "Name must contain at least 3 characters.", "error");
    return;
  }

  // Email Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newUser.email)) {
    Swal.fire("Error", "Please enter a valid email address.", "error");
    return;
  }

  // Phone Validation
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(newUser.phone_number)) {
    Swal.fire("Error", "Phone number must contain exactly 10 digits.", "error");
    return;
  }

  // Password Validation
  const password = newUser.password;
  if (password.length < 8) {
    Swal.fire("Error", "Password must contain at least 8 characters.", "error");
    return;
  }

  if (!/[A-Z]/.test(password)) {
    Swal.fire("Error", "Password must contain at least one uppercase letter.", "error");
    return;
  }

  if (!/[a-z]/.test(password)) {
    Swal.fire("Error", "Password must contain at least one lowercase letter.", "error");
    return;
  }

  if (!/[0-9]/.test(password)) {
    Swal.fire("Error", "Password must contain at least one number.", "error");
    return;
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    Swal.fire("Error", "Password must contain at least one special character.", "error");
    return;
  }

  // Send Request
  try {
    await api.post("/api/admin/users", newUser);
    Swal.fire("Success", "User added successfully.", "success");
    fetchUsers();
    setShowAdd(false);
    setNewUser({
      name: "",
      email: "",
      phone_number: "",
      password: ""
    });
  } catch (error) {
    console.log(error);
  }
};

// Status Update
const handleStatusChange = async (id, status) => {

  try {
    const response = await api.put(`/api/admin/users/${id}/status`,
      {
        status: status
      }
    );
    // alert(response.data.message);
    // fetchUsers();
    Swal.fire("Success", "Status changed successfully.", "success");
    fetchUsers();
  }

  catch(error){
    console.error(error);
    Swal.fire({
      title: "Error",
      text: error.response?.data?.detail || "Unable to update status.",
      icon: "error"
    });
  }

};

// Delete User
const handleDeleteUser = async (id) => {

  const result = await Swal.fire({
    title: "Delete User?",
    text: "This user will be permanently removed.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel"
  });

  if (!result.isConfirmed) return;

  try {
    const response = await api.delete(`/api/admin/users/${id}`);
    await Swal.fire({
      title: "Deleted!",
      text: response.data.message,
      icon: "success",
      timer: 1500,
      showConfirmButton: false
    });
    fetchUsers();

  } catch (error) {
    console.error(error);
    Swal.fire({
      title: "Error",
      text: error.response?.data?.detail || "Unable to delete user.",
      icon: "error"
    });
  }

};

return (
  <>
  <div className="back-header">
    <button className="back-btn" title="Go Back to Dashboard" onClick={() => navigate("/admin")}>
      <i className="fa-solid fa-arrow-left"></i>
    </button>

    <h1>Manage Users</h1>

  </div>

    <div className="table-header">

      <button
        className="button-actions"
        onClick={() => setShowAdd(true)}
      >
        Add User
      </button>

      <div className="search-container">
        <i className="fa-solid fa-magnifying-glass search-icon"></i>
        <input type="text" className="search-box" placeholder="Search by name or email..." value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
      </div>

    </div>

    <table>

      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Phone Number</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>

        {currentUsers.length === 0 ? (

          <tr>
            <td colSpan="5" className="empty-table">
              No users found.
            </td>
          </tr>

          ) : (

          currentUsers.map((user) => (

            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.phone_number}</td>
              <td>
                <select
                  className={`status-select ${user.status.toLowerCase()}`} value={user.status}
                  onChange={(e) =>
                    handleStatusChange(user.id, e.target.value)
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Locked">Locked</option>
                </select>
              </td>

              <td className="crud">
                <button className="delete-btn" title="Edit" onClick={() => handleDeleteUser(user.id)} >
                  {/* Delete */}
                  <i className="fa-solid fa-trash"></i>
                </button>
              </td>

            </tr>

          ))
        )}

      </tbody>

    </table>

    <div className="pagination">
      <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
        Previous
      </button>
      <span>
        Page {currentPage} of {totalPages || 1}
      </span>
      <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(currentPage + 1)} >
        Next
      </button>
    </div>

  {/* Add Modal */}
  {showAdd && (

  <div className="user-form-container">

    <div className="user-form">

      <h2>Add User</h2>

      <label htmlFor="name">Full Name <span className="required">*</span> </label>
      <input id="name" type="text" name="name" value={newUser.name} onChange={handleInputChange} required />

      <label htmlFor="email">Email Address <span className="required">*</span> </label>
      <input id="email" type="email" name="email" value={newUser.email} onChange={handleInputChange} required />

      <label htmlFor="phone">Phone Number <span className="required">*</span> </label>
      <input id="phone" type="tel" name="phone_number" value={newUser.phone_number} onChange={handleInputChange} required />

      <label htmlFor="password">Password <span className="required">*</span> </label>
      <input id="password" type="password" name="password" value={newUser.password} onChange={handleInputChange} required />

      <div className="modal-buttons">
        {/* Save */}
        <button className="save-btn" onClick={handleAddUser} >
          Save
        </button>
        {/* Cancel */}
        <button className="cancel-btn" onClick={() => setShowAdd(false)} >
          Cancel
        </button>
      </div>

    </div>

  </div>
  )}

</>

);
}

export default UsersSection;
