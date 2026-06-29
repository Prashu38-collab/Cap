import { useState, useEffect } from "react";
import axios from "axios";

function DashboardSection() {

  const [stats, setStats] = useState({
    users: 0,
    destinations: 0,
    hotels: 0,
    itineraries: 0
  });

  const [messages, setMessages] = useState([]);

  const [activities, setActivities] = useState([]);

  const [categories, setCategories] =useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {

  try {

    const statsResponse = await axios.get("http://localhost:8000/api/admin/stats");

    const messagesResponse = await axios.get("http://localhost:8000/api/admin/messages/recent");

    const activitiesResponse = await axios.get("http://localhost:8000/api/admin/activity");

    const categoryResponse = await axios.get("http://localhost:8000/api/admin/dashboard/popular-categories");

    setStats(statsResponse.data);

    setMessages(messagesResponse.data);

    setActivities(activitiesResponse.data);

    setCategories(categoryResponse.data);

  }

  catch(error) {
    console.error(error);
  }

};

  return (
    <>
    {/* -------------------Greeting------------ */}
      <h1>Welcome Admin!</h1>

      {/* -------------------Statistics------------ */}
      <div className="admin-stats-grid">

        <div className="admin-stat-card">
          <div className="stat-icon">
            <i className="fa-solid fa-users"></i>
          </div>
          <p>{stats.users}</p>
          <h3>Users</h3>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon">
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <p>{stats.destinations}</p>
          <h3>Destinations</h3>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon">
            <i className="fa-solid fa-hotel"></i>
          </div>
          <p>{stats.hotels}</p>
          <h3>Hotels</h3>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon">
            <i className="fa-solid fa-route"></i>
          </div>
          <p>{stats.itineraries}</p>
          <h3>Generated Itineraries</h3>
        </div>

      </div>

      {/* -------------------Popular Category Chart------------ */}
      <div className="dashboard-card">

        <h3>Popular Travel Categories</h3>

        <div className="category-chart">
          {categories.map((category) => (

          <div className="category-row" key={category.id}>
            <span>{category.category}</span>

            <div className="progress">
              <div className="progress-fill"
                style={{
                width:`${category.count}%`
                }}
                >
              </div>
            </div>

          </div>

          ))
          }

        </div>

      </div>

      {/* -------------------Recent section------------ */}
      <div className="dashboard-row">

        <div className="dashboard-card recentmessages">
          <h3>Recent Messages</h3>
          <ul>
            {messages.map((message) => (
              <li key={message.id}>
                <strong>{message.name}</strong>
                <p>{message.subject}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-card recentactivities">
          <h3>Recent Activity</h3>
          <ul>
            {activities.map((activity) => (
            <li key={activity.id}>
              {activity.description}
            </li>
            ))}
          </ul>
        </div>
        
      </div>

    </>
  );
}

export default DashboardSection;



// function DashboardSection() {
//   return (
//     <>
//       <h1>Welcome Admin!</h1>

//       <div className="admin-stats-grid">

//         <div className="admin-stat-card">
//           <h3>Users</h3>
//           <p>120+</p>
//         </div>

//         <div className="admin-stat-card">
//           <h3>Destinations</h3>
//           <p>88+</p>
//         </div>

//         <div className="admin-stat-card">
//           <h3>Hotels</h3>
//           <p>630+</p>
//         </div>

//         <div className="admin-stat-card">
//           <h3>Messages</h3>
//           <p>5+</p>
//         </div>

//       </div>
//     </>
//   );
// }

// export default DashboardSection;