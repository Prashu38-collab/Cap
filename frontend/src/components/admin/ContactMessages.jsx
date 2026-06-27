function ContactSection() {

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

      <h1>Contact Messages</h1>

      <table>

        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          {messages.map((message) => (
            <tr key={message.id}>

              <td>{message.name}</td>

              <td>{message.email}</td>

              <td>{message.subject}</td>

              <td>
                <span
                  className={
                    message.status === "Read"
                      ? "status read"
                      : "status unread"
                  }
                >
                  {message.status}
                </span>
              </td>

              <td>
                <a
                  href={`mailto:${message.email}?subject=Re: ${message.subject}`}
                  className="reply-btn"
                >
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