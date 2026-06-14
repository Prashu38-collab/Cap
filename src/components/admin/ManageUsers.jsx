function UsersSection() {

  const users = [
    {
      name: "Kritika Maharjan",
      email: "kritika@gmail.com",
      status: "Active"
    },
    {
      name: "Priety Maharjan",
      email: "priety@gmail.com",
      status: "Inactive"
    },
    {
      name: "Reshika Dhakal",
      email: "reshika@gmail.com",
      status: "Active"
    },
    {
      name: "Riddhishree Khanal",
      email: "riddhi@gmail.com",
      status: "Active"
    },
    {
      name: "Prashamsa Ghimire",
      email: "prashamsa@gmail.com",
      status: "Inactive"
    }
  ];

  return (
    <>
      <h1>Manage Users</h1>

      <button className="button-actions">
        Add User
      </button>

      <table>

        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          {users.map((user, index) => (

            <tr key={index}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td >{user.status}</td>
              <td className="crud">
                <button className="view-btn">View</button>
                <button className="edit-btn">Edit</button>
                <button className="delete-btn">Delete</button>
              </td>
            </tr>

          ))}

        </tbody>

      </table>
    </>
  );
}

export default UsersSection;