function UsersSection() {

  const users = [
    {
      name: "Ram",
      email: "ram@gmail.com"
    },
    {
      name: "Sita",
      email: "sita@gmail.com"
    }
  ];

  return (
    <>
      <h1>Manage Users</h1>

      <button className="add-btn">
        Add User
      </button>

      <table>

        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          {users.map((user, index) => (

            <tr key={index}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <button>View</button>
                <button>Edit</button>
                <button>Delete</button>
              </td>
            </tr>

          ))}

        </tbody>

      </table>
    </>
  );
}

export default UsersSection;