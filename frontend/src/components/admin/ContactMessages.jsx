import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import axios from "axios";
import Swal from "sweetalert2";

function ContactSection() {

  const API_URL = "http://localhost:8000/api/admin/messages";

  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Search
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const messagesPerPage = 6;

  // Filter
  const filteredMessages = messages.filter((message) =>
      message.name.toLowerCase().includes(search.toLowerCase()) ||
      message.email.toLowerCase().includes(search.toLowerCase()) ||
      message.subject.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const indexOfLastMessage = currentPage * messagesPerPage;
  const indexOfFirstMessage = indexOfLastMessage - messagesPerPage;

  const currentMessages = filteredMessages.slice(
      indexOfFirstMessage,
      indexOfLastMessage
  );

  const totalPages = Math.ceil(filteredMessages.length / messagesPerPage);

  useEffect(() => {
      fetchMessages();
      // const interval = setInterval(() => {
      //     fetchMessages();
      // }, 5000);
      // return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(API_URL);
      setMessages(response.data);
      const maxPage = Math.ceil(response.data.length / messagesPerPage);
      if (currentPage > maxPage && maxPage > 0) {
          setCurrentPage(maxPage);
      }

    } catch (error) {
      console.error(error);
    }
  }

  // ----------------View Messages-------------------
const handleView = async (message) => {

    console.log(message);

    try {
      if (message.status === "Unread") {

        const response = await axios.put(
            `${API_URL}/${message.message_id}/read`
        );

        console.log(response.data);
      }

      await fetchMessages();

      setSelectedMessage({
        ...message,
        status: "Read"
      });

      setShowModal(true);
    }

    catch(error){
      console.error(error);
    }
}

  // ------------------- Delete Message ----------------
  const handleDelete = async (message_id) => {

    const result = await Swal.fire({
        title: "Delete Message?",
        text: "This message will be permanently deleted.",
        icon: "warning",

        showCancelButton: true,

        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d",

        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",

        reverseButtons: true
    });

    if (!result.isConfirmed)
        return;

    try {
        await axios.delete(`${API_URL}/${message_id}`);
        await Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Message deleted successfully.",
            timer: 1500,
            showConfirmButton: false
        });

        await fetchMessages();
    }

    catch(error){
        console.error(error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Unable to delete message."
        });
    }
}

  return (
    <div className="message-page">

      <div className="back-header">
        <button className="back-btn" title="Go Back to Dashboard" onClick={() => navigate("/admin")}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h1>Contact Messages</h1>
      </div>

      <div className="table-header">

        <div className="search-container">

          <i className="fa-solid fa-magnifying-glass search-icon"></i>

          <input
            type="text"
            className="search-box"
            placeholder="Search by name, email or subject..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />

        </div>

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

          {filteredMessages.length === 0 ? (

          <tr>
              <td colSpan="5" className="empty-table">
                  No contact messages found.
              </td>
          </tr>

          ) : (

          currentMessages.map((message) => (
            <tr key={message.message_id}>

              <td>{message.name}</td>

              <td>{message.email}</td>

              <td>{message.subject}</td>

              <td>
                <span className={message.status === "Read" ? "status read" : "status unread"}>
                  {message.status}
                </span>
              </td>

              <td className="crud">
                <button className="view-btn" onClick={() => handleView(message)}>
                  View
                </button>

                {/* <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${message.email}&su=Re: ${message.subject}`}
                  target="_blank" rel="noreferrer" className="reply-btn">
                  Reply
                </a> */}

                <button className="delete-btn" onClick={() => handleDelete(message.message_id)}>
                  Delete
                </button>
              </td>

            </tr>
          ))

        )}

        </tbody>

      </table>

      <div className="pagination">

    <button
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(currentPage - 1)}
    >
        Previous
    </button>

    <span>
        Page {currentPage} of {totalPages || 1}
    </span>

    <button
        disabled={
            currentPage === totalPages ||
            totalPages === 0
        }
        onClick={() => setCurrentPage(currentPage + 1)}
    >
        Next
    </button>

</div>

      {/* ---------------- View Modal ----------------- */}
      {showModal && selectedMessage && (
        <div className="message-modal">

          <div className="message-box">

            <h2>Message Details</h2>

            <div className="message-info">
              <p><strong>Name:</strong> {selectedMessage.name}</p>

              <p><strong>Email:</strong> {selectedMessage.email}</p>

              <p><strong>Phone:</strong> {selectedMessage.phone}</p>

              <p>
                <strong>Received:</strong>{" "}
                {new Date(selectedMessage.created_at).toLocaleString()}
              </p>

              <p><strong>Subject:</strong> {selectedMessage.subject}</p>

              <p><strong>Message:</strong></p>

              <div className="message-content">
                {selectedMessage.message}
              </div>

            </div>

            <div className="modal-buttons">
              {/* <a href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`} className="reply-btn">
                Reply
              </a> */}
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Close
              </button>

            </div>

          </div>

        </div>
      )
      }

    </div>
  );
}

export default ContactSection;