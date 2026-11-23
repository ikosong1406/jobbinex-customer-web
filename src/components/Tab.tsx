import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { IoGridOutline, IoLogOutOutline } from "react-icons/io5";
import { FaBriefcase, FaUserCircle } from "react-icons/fa";
import { MdOutlineMessage } from "react-icons/md";
import { FiChevronRight } from "react-icons/fi";
import axios from "axios";
import localforage from "localforage";
import toast from "react-hot-toast";
import logo from "../assets/logo1.png";
import Api from "../components/Api";

const PRIMARY_COLOR = "#4eaa3c";
const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;

interface ClientUserData {
  firstname?: string;
  lastname?: string;
  [key: string]: unknown;
}

interface UserDataResponse {
  firstname?: string;
  lastname?: string;
  user?: ClientUserData;
  data?: ClientUserData | { user?: ClientUserData };
}

interface TabItem {
  path: string;
  name: string;
  icon: ReactNode;
  description: string;
}

const tabs: TabItem[] = [
  {
    path: "/dashboard",
    name: "Overview",
    icon: <IoGridOutline />,
    description: "Your workspace",
  },
  {
    path: "/jobs",
    name: "Jobs",
    icon: <FaBriefcase />,
    description: "Manage opportunities",
  },
  {
    path: "/inbox",
    name: "Inbox",
    icon: <MdOutlineMessage />,
    description: "Your conversations",
  },
  {
    path: "/profile",
    name: "Profile",
    icon: <FaUserCircle />,
    description: "Personal information",
  },
];

const Tab = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );
  const [userData, setUserData] = useState<ClientUserData | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      try {
        const token = await localforage.getItem<string>("authToken");

        if (!token) {
          if (isMounted) {
            toast.error("Please log in to continue.");
            navigate("/", { replace: true });
          }
          return;
        }

        const response = await axios.get<UserDataResponse>(
          USER_DATA_ENDPOINT,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Support APIs returning the user directly or nested in user/data.
        const payload = response.data;
        const nestedData =
          payload?.data && typeof payload.data === "object"
            ? payload.data
            : undefined;

        const resolvedUser =
          payload?.user ??
          (nestedData && "user" in nestedData
            ? nestedData.user
            : nestedData) ??
          payload;

        if (isMounted && resolvedUser && typeof resolvedUser === "object") {
          setUserData(resolvedUser as ClientUserData);
        }
      } catch (error: unknown) {
        console.error("User data fetch failed:", error);

        if (!isMounted) return;

        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403)
        ) {
          toast.error("Your session has expired.");
          await localforage.removeItem("authToken");
          if (isMounted) navigate("/", { replace: true });
        } else {
          toast.error("Unable to load your account information.");
        }
      }
    };

    void fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentTab =
    [...tabs]
      .sort((a, b) => b.path.length - a.path.length)
      .find(
        (tab) =>
          location.pathname === tab.path ||
          location.pathname.startsWith(`${tab.path}/`)
      )?.name || "Dashboard";

  const handleLogout = async (): Promise<void> => {
    try {
      await localforage.removeItem("authToken");
      toast.success("You have been logged out.", { duration: 1500 });
      navigate("/", { replace: true });
    } catch (error: unknown) {
      console.error("Logout failed:", error);
      toast.error("Unable to log out. Please try again.");
    }
  };

  const firstName =
    typeof userData?.firstname === "string" && userData.firstname.trim()
      ? userData.firstname.trim()
      : "User";
  const lastName =
    typeof userData?.lastname === "string" ? userData.lastname.trim() : "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const UserDisplay = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center
          text-white text-sm font-bold ring-4 ring-[#f3f7f1]"
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          {initials}
        </div>
        <span
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full
          bg-emerald-400 border-2 border-white"
        />
      </div>

      <div className={mobile ? "hidden sm:block" : ""}>
        <p className="text-sm font-bold text-gray-800 leading-tight">
          {firstName} {lastName}
        </p>
        <p className="text-xs text-gray-400 mt-1">Client Account</p>
      </div>
    </div>
  );

  // DESKTOP LAYOUT
  if (!isMobile) {
    return (
      <div className="flex h-screen w-full bg-[#f6f8f6] overflow-hidden">
        {/* SIDEBAR */}
        <aside
          className="w-[260px] shrink-0 bg-[#111a14] flex flex-col
          justify-between relative overflow-hidden"
        >
          {/* Decorative background */}
          <div
            className="absolute -top-32 -left-32 w-72 h-72
            bg-[#4eaa3c]/10 rounded-full blur-3xl pointer-events-none"
          />

          <div className="relative z-10">
            {/* Logo */}
            <div className="px-8 pt-9 pb-12">
              <img src={logo} alt="Logo" className="w-[125px] object-contain" />
              <div className="mt-5 flex items-center gap-2">
                <span className="w-7 h-[2px] bg-[#4eaa3c]" />
                <span
                  className="text-[10px] uppercase tracking-[3px]
                  text-gray-500 font-semibold"
                >
                  Client Portal
                </span>
              </div>
            </div>

            {/* Navigation */}
            <div className="px-5">
              <p
                className="text-[10px] font-bold tracking-[2px]
                uppercase text-gray-500 mb-5 px-3"
              >
                Workspace
              </p>

              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    end
                    className={({ isActive }) => `
                      group flex items-center gap-4 px-4 py-3.5
                      rounded-xl transition-all duration-300
                      ${
                        isActive
                          ? "bg-[#4eaa3c] text-white shadow-lg shadow-[#4eaa3c]/20"
                          : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                      }
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`text-xl transition-transform
                          duration-300 group-hover:scale-110
                          ${isActive ? "text-white" : "text-gray-500 group-hover:text-[#4eaa3c]"}`}
                        >
                          {tab.icon}
                        </span>

                        <div className="flex-1">
                          <p className="text-sm font-semibold">{tab.name}</p>
                          <p
                            className={`text-[10px] mt-0.5
                            ${isActive ? "text-white/70" : "text-gray-600"}`}
                          >
                            {tab.description}
                          </p>
                        </div>

                        {isActive && (
                          <FiChevronRight className="text-white/80" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="relative z-10 p-5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3
                text-gray-400 hover:text-red-400 hover:bg-red-500/10
                rounded-xl transition-all duration-300 text-sm font-medium"
            >
              <IoLogOutOutline size={20} />
              Sign out
            </button>

            <p className="text-[10px] text-gray-600 text-center mt-5">
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </aside>

        {/* MAIN AREA */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* HEADER */}
          <header
            className="h-[82px] shrink-0 bg-[white] border-b
            border-gray-100 flex items-center justify-between px-8 lg:px-10"
          >
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <span>Workspace</span>
                <FiChevronRight size={12} />
                <span className="text-[#4eaa3c] font-semibold">
                  {currentTab}
                </span>
              </div>

              <h1 className="text-xl font-bold text-[#17231a]">{currentTab}</h1>
            </div>

            <div className="flex items-center gap-6">
              <UserDisplay />
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-10">
            <div className="max-w-[1600px] mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // MOBILE LAYOUT
  return (
    <div className="min-h-screen bg-[#f6f8f6] flex flex-col">
      {/* MOBILE HEADER */}
      <header
        className="sticky top-0 z-40 bg-[#111a14]
        backdrop-blur-xl border-b border-gray-100 px-5 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-[90px] object-contain" />
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 flex items-center justify-center
              rounded-full text-white text-xs font-bold"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 p-2 pb-28 overflow-x-hidden">
        <Outlet />
      </main>

      {/* FLOATING BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-2">
        <nav
          className="max-w-lg mx-auto flex items-center justify-around
          bg-[#111a14] rounded-2xl shadow-2xl shadow-black/20
          border border-white/10 px-2 py-2"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end
              className={({ isActive }) => `
                flex flex-col items-center justify-center gap-1
                flex-1 py-1 rounded-xl transition-all duration-300
                ${
                  isActive
                    ? "bg-[#4eaa3c] text-white"
                    : "text-gray-500 hover:text-white"
                }
              `}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-semibold">{tab.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Tab;
