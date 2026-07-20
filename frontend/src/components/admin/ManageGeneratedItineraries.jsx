import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

function ManageGeneratedItineraries() {
  const navigate = useNavigate();
  const API = "http://localhost:8000/api/admin/generated-itineraries";

  const [itineraries, setItineraries] = useState([]);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [showView, setShowView] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Fetch Itineraries
  const fetchItineraries = async () => {
    try {
      const res = await axios.get(API);
      setItineraries(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchItineraries();
  }, []);

  // Delete
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Generated Itinerary?",
      text: "This generated itinerary will be permanently removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      const response = await axios.delete(`${API}/${id}`);

      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: response.data.message || "Itinerary deleted successfully.",
        timer: 1500,
        showConfirmButton: false
      });

      fetchItineraries();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.detail || "Unable to delete itinerary."
      });
    }
  };

  // Download
  const handleDownload = async (id) => {
    try {
      const response = await axios.get(`${API}/${id}`);
      const data = response.data;

      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `itinerary_${id}.json`;
      link.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Unable to download itinerary."
      });
    }
  };

  // View
  const handleView = async (id) => {
    try {
      const res = await axios.get(`${API}/${id}`);
      setSelectedItinerary(res.data);
      setShowView(true);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Unable to view itinerary."
      });
    }
  };

  // Search & Filter
const filtered = itineraries.filter((item) =>
  item.name?.toLowerCase().includes(search.toLowerCase()) ||
  item.itinerary_id?.toString().includes(search) ||
  item.generated_at?.toString().includes(search)
);

  // Pagination
  const totalPages = Math.ceil(filtered.length / recordsPerPage);
  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentItineraries = filtered.slice(indexOfFirst, indexOfLast);

  return (
    <div className="message-page">
      {/* Header */}
      <div className="back-header">
        <button
          className="back-btn"
          title="Go Back to Dashboard"
          onClick={() => navigate("/admin")}
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h1>Manage Generated Itineraries</h1>
      </div>

      {/* Search Bar */}
      <div className="table-header">
        <div className="search-container">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            type="text"
            className="search-box"
            placeholder="Search by user, itinerary id, or generated at..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Itinerary ID</th>
            <th>Budget</th>
            <th>Days</th>
            <th>Generated At</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {currentItineraries.length === 0 ? (
            <tr>
              <td colSpan="6" className="empty-table">
                No itineraries found.
              </td>
            </tr>
          ) : (
            currentItineraries.map((item) => (
              <tr key={item.itinerary_id}>
                <td>{item.name}</td>
                <td>{item.itinerary_id}</td>
                <td>Rs. {item.total_estimated_cost}</td>
                <td>{item.total_travel_days_used}</td>
                <td>
                  {new Date(item.generated_at).toLocaleDateString()}
                </td>
                <td className="crud">
                  <button
                    className="view-btn"
                    title="View"
                    onClick={() => handleView(item.itinerary_id)}
                  >
                    <i className="fa-solid fa-eye"></i>
                  </button>

                  <button
                    className="download-btn"
                    title="Download"
                    onClick={() => handleDownload(item.itinerary_id)}
                  >
                    <i className="fa-solid fa-download"></i>
                  </button>

                  <button
                    className="delete-btn"
                    title="Delete"
                    onClick={() => handleDelete(item.itinerary_id)}
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <i className="fa-solid fa-chevron-left"></i> Previous
        </button>

        <span>
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      {/* View Modal */}
      {showView && selectedItinerary && (
        <div className="message-modal" onClick={() => setShowView(false)}>
          <div className="message-box itinerary-view" onClick={(e) => e.stopPropagation()}>
            <h2>Generated Itinerary</h2>

            <div className="message-info">
              <p><strong>User:</strong> {selectedItinerary.name}</p>
              <p><strong>Status:</strong> {selectedItinerary.status}</p>
              <p>
                <strong>Estimated Cost:</strong>
                Rs. {selectedItinerary.total_estimated_cost}
              </p>
              <p>
                <strong>Travel Days:</strong>
                {selectedItinerary.total_travel_days_used}
              </p>
              <p>
                <strong>Generated At:</strong>
                {new Date(selectedItinerary.generated_at).toLocaleString()}
              </p>

              <hr />

              {selectedItinerary.itinerary_data?.itinerary?.map((day) => (
                <div key={day.day} className="day-card">
                  <h3>DAY {day.day}</h3>
                  <p>
                    <strong>District:</strong>
                    {day.district}
                  </p>
                  <p>
                    <strong>Hotel:</strong>
                    {day.hotel?.hotel_name || "N/A"}
                  </p>

                  <h4>Places:</h4>
                  {day.places?.map((place, index) => (
                    <div key={index} className="place-card">
                      <p>
                        <strong>Name:</strong>
                        {place.name}
                      </p>
                      <p>
                        <strong>Category:</strong>
                        {place.category}
                      </p>
                      <p>
                        <strong>Duration:</strong>
                        {place.duration} hrs
                      </p>
                      <p>
                        <strong>Transport:</strong>
                        {place.transport_mode || "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowView(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageGeneratedItineraries;