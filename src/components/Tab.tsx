import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { IoGrid, IoLogOut } from "react-icons/io5";
import { FaBriefcase } from "react-icons/fa";
import { MdMessage } from "react-icons/md";
import { FaUser } from "react-icons/fa";
import Logo from "./Logo";

interface TabItem {
  path: string;
  name: string;
  icon: React.ReactNode;
}

const Tab: React.FC = () => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const tabs: TabItem[] = [
    { path: "/customer/dashboard", name: "Overview", icon: <IoGrid size={20} /> },
    {
      path: "/customer/jobs",
      name: "Jobs",
      icon: <FaBriefcase size={20} />,
    },
    { path: "/customer/inbox", name: "Inbox", icon: <MdMessage size={20} /> },
    { path: "/customer/profile", name: "Profile", icon: <FaUser size={20} /> },
  ];

  const currentTab: string =
    tabs.find((tab) => location.pathname.startsWith(tab.path))?.name ||
    "Dashboard";

  const handleLogout = (): void => {
    console.log("Logged out");
  };

  // --- Desktop Layout ---
  if (!isMobile) {
    return (
      <div className="flex h-screen bg-gray-50 w-full">
        {/* Sidebar */}
        <aside className="w-[20%] bg-[#121212] shadow-lg flex flex-col justify-between">
          <div>
            {/* Business Profile */}
            <div className="flex items-center mt-8 px-5">
              <Logo />
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 mt-8">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={({ isActive }) =>
                    `w-[85%] flex items-center p-3 transition-colors ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white font-medium"
                        : "text-white hover:bg-gray-800"
                    }`
                  }
                  style={{
                    borderTopRightRadius: 20,
                    borderBottomRightRadius: 20,
                  }}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.name}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Logout Button */}
          <div className="p-5">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full bg-[var(--color-primary)] text-white py-2 rounded-lg transition"
            >
              <IoLogOut size={18} className="mr-2" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm">
            <h1 className="text-xl font-bold text-gray-800">{currentTab}</h1>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-primary)] text-white font-semibold rounded-full">
                A
              </div>

              <div className="text-sm text-gray-700 font-medium font-semibold">
                Alexander
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // --- Mobile Layout ---
  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">{currentTab}</h1>
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-primary)] text-white font-semibold rounded-full">
            A
          </div>
          <div className="text-lg text-gray-700 font-medium font-semibold">
            Alexander
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#121212] shadow-lg border-t border-gray-700">
        <nav className="flex justify-around items-center">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 px-4 w-full ${
                  isActive ? "text-[var(--color-primary)]" : "text-white"
                }`
              }
            >
              <span className="mb-1">{tab.icon}</span>
              <span className="text-xs">{tab.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Tab;
