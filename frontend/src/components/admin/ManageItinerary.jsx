function ItinerarySection() {

  const itineraries = [
    {
      title: "Kathmandu Tour",
      duration: "2 Days",
      category: "Culture"
    },
    {
      title: "Ama Yangri Trek",
      duration: "2 Days",
      category: "Adventure"
    },
    {
      title: "Nagarkot Nightstay",
      duration: "3 Days",
      category: "Nature"
    },
    {
      title: "Changunarayan Visit",
      duration: "2 Days",
      category: "Religious"
    },
    {
      title: "Chitwan Safari",
      duration: "5 Days",
      category: "Adventure"
    }
  ];

  return (
    <>
      <h1>Manage Itineraries</h1>

      <button className="button-actions">
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

export default ItinerarySection;