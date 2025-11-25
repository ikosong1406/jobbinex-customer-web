import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
// import localforage from "localforage";
// import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/Forgot";
import TabLayout from "./components/Tab";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Inbox from "./pages/Inbox";
import Profile from "./pages/Profile";

// --- Protected Route Component ---
/**
 * Checks for the presence of the authentication token in localforage.
 * Renders nested routes if authenticated, otherwise redirects to the login page.
 */
// const ProtectedLayout = () => {
//   // isAuthenticated: null = checking auth, false = not logged in, true = logged in
//   const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const checkAuth = async () => {
//       try {
//         // Retrieve the token saved during login (using the key 'authToken' from the Login component)
//         const token = await localforage.getItem("authToken");

//         // If token exists and is a non-empty string, set isAuthenticated to true
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

//   // If authenticated, render the nested routes via Outlet
//   // If not authenticated, redirect to the root path (which is Login)
//   return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
// };

// --- Main App Component ---
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes (Accessible without login) */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<ForgotPassword />} />

        {/* Protected Routes 
          Any route nested under this will require the user to be authenticated 
          as determined by the logic in ProtectedLayout. 
        */}
        {/* <Route element={<ProtectedLayout />}> */}
        {/* Main Customer Dashboard with Tabs */}
        {/* Path is "/customer" */}
        <Route path="/customer" element={<TabLayout />}>
          {/* Redirect /customer to /customer/dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Fallback for any protected route that doesn't match above */}
        {/* Redirects any unmatched path inside the protected area back to the dashboard */}
        <Route
          path="*"
          element={<Navigate to="/customer/dashboard" replace />}
        />
        {/* </Route> */}

        {/* Catch-all route for any unhandled PUBLIC paths. 
          If a user tries to access /some-random-public-page, they will be redirected to Login.
        */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
