function ItinerarySection() {

  const itineraries = [
    {
      title: "Kathmandu Tour",
      duration: "2 Days"
    },
    {
      title: "Chitwan Safari",
      duration: "3 Days"
    }
  ];

  return (
    <>
      <h1>Manage Itineraries</h1>

      <button className="add-btn">
        Add Itinerary
      </button>

      <table>

        <thead>
          <tr>
            <th>Title</th>
            <th>Duration</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          {itineraries.map((trip, index) => (

            <tr key={index}>
              <td>{trip.title}</td>
              <td>{trip.duration}</td>
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

export default ItinerarySection;