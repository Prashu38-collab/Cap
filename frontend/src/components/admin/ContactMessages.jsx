import { useNavigate } from "react-router-dom";

function ContactSection({ setActivePage }) {

  const navigate = useNavigate();

  const messages = [
    {
      id: 1,
      name: "Prashamsa Ghimire",
      email: "prashu@gmail.com",
      subject: "System Malfunction",
      status: "Unread",
    },
    {
      id: 2,
      name: "Reshika Dhakal",
      email: "reshu@gmail.com",
      subject: "Itinerary Feedback",
      status: "Read",
    },
    {
      id: 3,
      name: "Ridddhishree Khanal",
      email: "riddhi@gmail.com",
      subject: "More features required",
      status: "Unread",
    },
  ];

  return (
    <div className="message-page">

      <div className="back-header">
        <button className="back-btn" title="Go Back to Dashboard" onClick={() => setActivePage("dashboard")} >
          <i className = "fa-solid fa-arrow-left"></i>
        </button>

        <h1>Contact Messages</h1>

      </div>

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
                <span className = { message.status === "Read" ? "status read" : "status unread" } >
                  {message.status}
                </span>
              </td>

              <td className="crud">
                <button className="view-btn">View</button>
                <a href={`mailto:${message.email}?subject=Re: ${message.subject}`} className="reply-btn" >
                  Reply
                </a>
              </td>

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}

export default ContactSection;