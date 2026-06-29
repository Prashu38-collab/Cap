import { useState, useEffect } from "react";
import axios from "axios";

function ContactSection({ setActivePage }) {

  const [messages, setMessages] = useState([]);

  const [selectedMessage, setSelectedMessage] = useState(null);

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try{
      const response = await axios.get("http://localhost:8000/api/admin/messages");
      setMessages(response.data);
    }

    catch(error){
      console.error(error);
    }
  }

  // ----------------View Messages-------------------
  const handleView = async(id)=>{
    try{
      await axios.put(`http://localhost:8000/api/admin/messages/${id}/read`);
      setSelectedMessage({
        ...message,
        status: "Read"
      });

      setShowModal(true);

      fetchMessages();
    }

    catch(error){
      console.error(error);
    }
  }

   // ------------------- Delete Message ----------------

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this message?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`http://localhost:8000/api/admin/messages/${id}`);
      fetchMessages();
    }

    catch (error) {
      console.error(error);
    }
  };

   return (
    <div className="message-page">

      <div className="back-header">
        <button className="back-btn" title="Go Back to Dashboard" onClick={() => setActivePage("dashboard")} >
          <i className = "fa-solid fa-arrow-left"></i>
        </button>

        <h1>Contact Messages</h1>

      </div>
      {/* ----------Table--------------- */}
      <table>

        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          {messages.map((message) => (
            <tr key={message.id}>

              <td>{message.name}</td>

              <td>{message.email}</td>

              <td>{message.subject}</td>

              <td>
                <span className = { message.status === "Read" 
                  ? "status read" 
                  : "status unread" 
                  } >
                  {message.status}
                </span>
              </td>

              <td className="crud">
                <button className="view-btn" onClick={() => handleView(message)} >View</button>
                <a href={`mailto:${message.email}?subject=Re: ${message.subject}`} className="reply-btn" >
                  Reply
                </a>

                <button className="delete-btn" onClick={() => handleDelete(message.id)} >
                  Delete
                </button>
              </td>

            </tr>
          ))}

        </tbody>

      </table>

      {/* ---------------- View Modal ----------------- */}

      {showModal && selectedMessage && (

        <div className="message-modal">
          <div className="message-box">
            <h2>Message Details</h2>
            <div className="message-info">
              <p>
                <strong>Name:</strong>
                {selectedMessage.name}
              </p>

              <p>
                <strong>Email:</strong>
                {selectedMessage.email}
              </p>

              <p>
                <strong>Subject:</strong>
                {selectedMessage.subject}
              </p>

              <p>
                <strong>Message:</strong>
              </p>

              <div className="message-content">
                {selectedMessage.message}
              </div>

            </div>

            <div className="modal-buttons">

              <a href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`} className="reply-btn" >
                Reply
              </a>

              <button className="cancel-btn" onClick={() => setShowModal(false)} >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default ContactSection;







// import { useNavigate } from "react-router-dom";

// function ContactSection({ setActivePage }) {

//   const navigate = useNavigate();

//   const messages = [
//     {
//       id: 1,
//       name: "Prashamsa Ghimire",
//       email: "prashu@gmail.com",
//       subject: "System Malfunction",
//       status: "Unread",
//     },
//     {
//       id: 2,
//       name: "Reshika Dhakal",
//       email: "reshu@gmail.com",
//       subject: "Itinerary Feedback",
//       status: "Read",
//     },
//     {
//       id: 3,
//       name: "Ridddhishree Khanal",
//       email: "riddhi@gmail.com",
//       subject: "More features required",
//       status: "Unread",
//     },
//   ];

//   return (
//     <div className="message-page">

//       <div className="back-header">
//         <button className="back-btn" title="Go Back to Dashboard" onClick={() => setActivePage("dashboard")} >
//           <i className = "fa-solid fa-arrow-left"></i>
//         </button>

//         <h1>Contact Messages</h1>

//       </div>

//       <table>

//         <thead>
//           <tr>
//             <th>Name</th>
//             <th>Email</th>
//             <th>Subject</th>
//             <th>Status</th>
//             <th>Actions</th>
//           </tr>
//         </thead>

//         <tbody>

//           {messages.map((message) => (
//             <tr key={message.id}>

//               <td>{message.name}</td>

//               <td>{message.email}</td>

//               <td>{message.subject}</td>

//               <td>
//                 <span className = { message.status === "Read" ? "status read" : "status unread" } >
//                   {message.status}
//                 </span>
//               </td>

//               <td className="crud">
//                 <button className="view-btn">View</button>
//                 <a href={`mailto:${message.email}?subject=Re: ${message.subject}`} className="reply-btn" >
//                   Reply
//                 </a>
//               </td>

//             </tr>
//           ))}

//         </tbody>

//       </table>

//     </div>
//   );
// }

// export default ContactSection;