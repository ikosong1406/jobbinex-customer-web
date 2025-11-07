import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  // Outlet,
} from "react-router-dom";
// import localForage from "localforage";
// import { useEffect, useState } from "react";
// import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/Forgot";
import TabLayout from "./components/Tab";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Inbox from "./pages/Inbox";
import Profile from "./pages/Profile";

// Renamed and simplified the component for clarity
// const ProtectedLayout = () => {
//   const [isAuthenticated, setIsAuthenticated] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const checkAuth = async () => {
//       try {
//         const token = await localForage.getItem("token");
//         setIsAuthenticated(!!token);
//       } catch (error) {
//         console.error("Auth check failed:", error);
//         setIsAuthenticated(false);
//       } finally {
//         setLoading(false);
//       }
//     };
//     checkAuth();
//   }, []);

//   if (loading) {
//     return <Splash />;
//   }

//   return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
// };

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<ForgotPassword />} />

        {/* Protected Routes - All nested under a single ProtectedLayout */}
        {/* <Route element={<ProtectedLayout />}> */}
        {/* Redirect authenticated users from the root to the merchant dashboard */}
        <Route path="/" element={<Navigate to="/alt" replace />} />

        {/* Main Merchant Dashboard with Tabs */}
        <Route path="/customer" element={<TabLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* <Route path="*" element={<Navigate to="/merchant" replace />} />
        </Route> */}

        {/* Catch-all route for any unhandled paths */}
        {/* <Route path="*" element={<Navigate to="/login" replace />} /> */}
      </Routes>
    </Router>
  );
}
