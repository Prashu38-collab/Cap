function DashboardSection() {
  return (
    <>
      <h1>Welcome Admin 👋</h1>

      <div className="admin-stats-grid">

        <div className="admin-stat-card">
          <h3>Users</h3>
          <p>120+</p>
        </div>

        <div className="admin-stat-card">
          <h3>Itineraries</h3>
          <p>5+</p>
        </div>

        <div className="admin-stat-card">
          <h3>Destinations</h3>
          <p>88+</p>
        </div>

        <div className="admin-stat-card">
          <h3>Hotels</h3>
          <p>30+</p>
        </div>

      </div>
    </>
  );
}

export default DashboardSection;