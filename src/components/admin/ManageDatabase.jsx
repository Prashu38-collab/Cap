function DatabaseSection() {
  return (

    <div className="database-page">

      <h1>Manage Database</h1>

      <div className="database-actions">
        <button>Import CSV</button>
        <button>Export CSV</button>
        <button>Refresh Data</button>
      </div>

      <table className="database-table">

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
            <td>45</td>
            <td>
              <span className="status active">
                Active
              </span>
            </td>
          </tr>

          <tr>
            <td>Destinations</td>
            <td>60</td>
            <td>
              <span className="status active">
                Active
              </span>
            </td>
          </tr>

          <tr>
            <td>Hotels</td>
            <td>25</td>
            <td>
              <span className="status active">
                Active
              </span>
            </td>
          </tr>

        </tbody>

      </table>

    </div>

  );
}

export default DatabaseSection;