import { useState, useEffect } from "react";
import api from "../../utils/api.js";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend
} from "recharts";

function DashboardSection() {

  const [stats, setStats] = useState({
    users: 0,
    destinations: 0,
    hotels: 0,
    itineraries: 0
  });

  const [recentMessages, setRecentMessages] = useState([]);
  const [activities, setActivities] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {

  // Stats
  try {
    const statsResponse = await api.get("/api/admin/stats");
    setStats(statsResponse.data);
  } catch (error) {
    console.error("Stats Error:", error);
  }

  // Recent Messages
  try{
    const messagesResponse = await api.get("/api/admin/dashboard/recent-messages");
    setRecentMessages(messagesResponse.data);
  } catch(error){
    console.error(error);
  }

  // Recent Activities
  try {
    const activitiesResponse = await api.get("/api/admin/dashboard/recent-activities");
    setActivities(activitiesResponse.data);
  } catch (error) {
    console.error(error);
  }

  // Category piechart
  try{
    const categoryResponse = await api.get("/api/admin/dashboard/category-distribution");
    setCategoryData(categoryResponse.data);
  }catch(error){
    console.error(error);
  }

  // Districts bar graph
  try {
    const districtresponse = await api.get("/api/admin/dashboard/districts");
    setDistrictData(districtresponse.data);
  }catch(error){
    console.log(erroror);
  }

};

  return (
    <>
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

      <div className="dashboard-charts">

        {/* -------------------Destinations per District Chart------------ */}
        <div className="chart-card">

          <h3>Destinations per District</h3>

          <div className="chart-content">
            <ResponsiveContainer width="100%" height={450} >
              <BarChart data={districtData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="District" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="total" fill="#3B82F6" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* -------------------Popular Category Chart------------ */}
        <div className="chart-card">
          <h3>Popular Travel Categories</h3>
          <ResponsiveContainer width="100%" height={320} >
            <PieChart>
              <Pie data={categoryData} dataKey="total" nameKey="category" outerRadius={110} label>
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={["#3b82f6", "#22c55e", "#f97316", "#e11d48"][index % 4]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend layout="vertical" align="right" verticalAlign="middle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>


      {/* <div className="dashboard-charts"> */}

        {/* -------------------Recent Messasges------------ */}

        <div className="recent-card">
          <h3>Recent Messages</h3>
          {recentMessages.length === 0 ? (
            <div>No messages found.</div>
          ) : (
          recentMessages.map((msg) => (
            <div key={msg.message_id} className="message-item" >
              <div className="message-row">
                <span className="message-sender">{msg.name}</span>
                <span className="message-subject">{msg.subject}</span> - 
                <span className="message-preview">
                  {/* {msg.message.length > 50 ? msg.message.substring(0, 70) + "..." : msg.message} */}
                  {msg.message}
                </span>
                <span className="message-date">{new Date(msg.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
          )}
        </div>

        {/* -------------------Recent Activity------------ */}
        
        <div className="recent-card">
          <h3>Recent Activity</h3>
          {activities.length === 0 ? (
            <div>No activity found.</div>
          ) : (
          activities.map((act) => (
            <div key={act.activity_id} className="message-item" >
              <div className="message-row">
                <span className="message-sender"> {act.action_type}</span>
                <span className="message-subject">
                  {/* {act.description.length > 60
                    ? act.description.substring(0, 60) + "..."
                    : act.description} */}
                    {act.description}
                </span>
                <span className="message-date"> {new Date(act.created_at).toLocaleDateString()} </span>
              </div>
            </div>
          ))
          )}
      {/* </div> */}

    </div>

    </>
  );
}

export default DashboardSection;
