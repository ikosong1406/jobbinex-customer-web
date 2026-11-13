import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/Forgot";
import TabLayout from "./components/Tab";

import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Inbox from "./pages/Inbox";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";
import Checkout from "./pages/Checkout";
import Activate from "./pages/Activate";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<ForgotPassword />} />

        {/* Dashboard Layout */}
        <Route element={<TabLayout />}>
          {/* Default dashboard redirect */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/setup" element={<ProfileSetup />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/activate" element={<Activate />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
