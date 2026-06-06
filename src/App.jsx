import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PlanTrip from "./pages/PlanTrip";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/plantrip" element={<PlanTrip />} />
    </Routes>
  );
}

export default App;