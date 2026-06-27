function DatabaseSection() {
  return (
    <>

      <h1>Manage Database</h1>

      <div className="database-buttons">
        <button className="button-actions">Import CSV</button>
        <button className="button-actions">Export CSV</button>
        <button className="button-actions">Refresh Data</button>
      </div>

      <table>

        <thead>
          <tr>
            <th>Table Name</th>
            <th>Records</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          <tr>
            <td>Users</td>
            <td>120</td>
            <td>
              <span className="status active">
                Active
              </span>
            </td>
          </tr>

          <tr>
            <td>Itineraries</td>
            <td>5</td>
            <td>
              <span className="status active">
                Active
              </span>
            </td>
          </tr>

          <tr>
            <td>Destinations</td>
            <td>88</td>
            <td>
              <span className="status active">
                Active
              </span>
            </td>
          </tr>

          <tr>
            <td>Hotels</td>
            <td>30</td>
            <td>
              <span className="status active">
                Active
              </span>
            </td>
          </tr>

        </tbody>

      </table>

    </>

  );
}

export default DatabaseSection;