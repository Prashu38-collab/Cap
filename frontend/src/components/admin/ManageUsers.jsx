import { useState, useEffect } from "react";
import axios from "axios";

function UsersSection({ setActivePage }) {

// -----------------------------------------------------(IMPortant)-api endpoint for user to be changed after integration
const API_URL = "http://localhost:8000/api/users";

const [users, setUsers] = useState([]);

const [showForm, setShowForm] = useState(false);

const [newUser, setNewUser] = useState({
name: "",
email: "",
phone_number: "",
password: ""
});

useEffect(() => {
fetchUsers();
}, []);

const fetchUsers = async () => {

  try {
    const response = await axios.get(API_URL);
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

const handleAddUser = async () => {

  if (
    !newUser.name ||
    !newUser.email ||
    !newUser.phone_number ||
    !newUser.password
  ) {
    alert("Please fill all fields");
    return;
  }

  try {
    await axios.post(API_URL, newUser);
    fetchUsers();
    setNewUser({
      name: "",
      email: "",
      phone_number: "",
      password: ""
    });

    setShowForm(false);

  } catch (error) {
    console.error("Error adding user:", error);
    alert("Failed to add user");
  }

};

const handleDeleteUser = async (id) => {

  const confirmDelete = window.confirm(
    "Are you sure you want to delete this user?"
  );

  if (!confirmDelete) return;

  try {
    await axios.delete(`${API_URL}/${id}`);
    fetchUsers();
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("Failed to delete user");
  }

};

return (
  <>
  <div className="back-header">
    <button className="back-btn" title="Go Back to Dashboard" onClick={() => setActivePage("dashboard")} >
      <i className="fa-solid fa-arrow-left"></i>
    </button>

    <h1>Manage Users</h1>

  </div>

{!showForm ? (

  <>
  <button className="button-actions" onClick={() => setShowForm(true)} >
    Add User
  </button>

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

        {users.map((user) => (

          <tr key={user.id}>

            <td>{user.name}</td>

            <td>{user.email}</td>

            <td>{user.phone_number}</td>

            <td>
              <span className={
                  user.status === "Active"
                    ? "status active"
                    : "status inactive"
                }
              >
                {user.status}
              </span>
            </td>

            <td className="crud">

              <button className="delete-btn" onClick={() => handleDeleteUser(user.id)} >
                Delete
              </button>

            </td>

          </tr>

        ))}

      </tbody>

    </table>
  </>

) : (

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

      <div className="form-buttons">

        <button className="save-btn" onClick={handleAddUser} >
          Save
        </button>

        <button className="cancel-btn" onClick={() => setShowForm(false)} >
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





// import { useState } from "react";
// import { useNavigate } from "react-router-dom";

// function UsersSection({ setActivePage }) {

//   // const navigate = useNavigate();

//   const [showForm, setShowForm] = useState(false);

//   const users = [
//     {
//       id: 1,
//       name: "Kritika Maharjan",
//       email: "kritika@gmail.com",
//       status: "Active"
//     },
//     {
//       id: 2,
//       name: "Priety Maharjan",
//       email: "priety@gmail.com",
//       status: "Inactive"
//     },
//     {
//       id: 3,
//       name: "Reshika Dhakal",
//       email: "reshika@gmail.com",
//       status: "Active"
//     },
//     {
//       id: 4,
//       name: "Riddhishree Khanal",
//       email: "riddhi@gmail.com",
//       status: "Active"
//     },
//     {
//       id: 5,
//       name: "Prashamsa Ghimire",
//       email: "prashamsa@gmail.com",
//       status: "Inactive"
//     }
//   ];

//   return (
//     <>
//       <div className="back-header">
//         <button className="back-btn" onClick={() => setActivePage("dashboard")} >
//           <i className = "fa-solid fa-arrow-left"></i>
//         </button>

//         <h1>Manage Users</h1>

//       </div>

//       <button className="button-actions" onClick={() => setShowForm(true)} >
//         Add User
//       </button>

//       <table>

//         <thead>
//           <tr>
//             <th>Name</th>
//             <th>Email</th>
//             <th>Status</th>
//             <th>Action</th>
//           </tr>
//         </thead>

//         <tbody>

//           {users.map((user) => (

//             <tr key={user.id}>

//               <td>{user.name}</td>

//               <td>{user.email}</td>

//               <td>
//                 <span className = { user.status === "Active" ? "status active" : "status inactive" } >
//                   {user.status}
//                 </span>
//               </td>

//               <td className="crud">
//                 <button className="delete-btn">Delete</button>
//               </td>
//             </tr>

//           ))}

//         </tbody>

//       </table>

//        {/* Add User Form */}
//       {showForm && (
//         <div className="user-form-modal">

//           <div className="user-form">

//             <h2>Add User</h2>

//             <input
//               type="text"
//               placeholder="Full Name"
//             />

//             <input
//               type="email"
//               placeholder="Email"
//             />

//             <input
//               type="tel"
//               placeholder="Phone Number"
//             />

//             <input
//               type="password"
//               placeholder="Password"
//             />

//             <div className="form-buttons">

//               <button className="save-btn" onClick={handleAddUser} >
//                 Save
//               </button>

//               <button
//                 className="cancel-btn"
//                 onClick={() => setShowForm(false)}
//               >
//                 Cancel
//               </button>

//             </div>

//           </div>

//         </div>
//       )}

//     </>
//   );
// }

// export default UsersSection;