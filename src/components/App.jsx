import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import SimpleCalendar from "./SimpleCalendar";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import LoginComponent from "./LoginComponent";

const CalendarApp = () => {
  const [view, setView] = useState("month");
  const { user, isAuthenticated, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your calendar...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginComponent />;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isAuthenticated={isAuthenticated} />
      <div className="flex-1 p-5 bg-gray-100 overflow-auto box-border pt-20">
        {/* Header with auth controls */}
        <div className="flex justify-between items-center mb-4 relative">
          <h2 className="text-blue-600 font-bold m-0 text-xl">Calendar view</h2>

          <div className="flex items-center">
            {/* View controls */}
            <div className="mr-4">
              <button
                onClick={() => setView("month")}
                className={`py-1 px-2.5 mx-1 border border-gray-300 rounded ${
                  view === "month"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-black"
                }`}
              >
                month
              </button>
              <button
                onClick={() => setView("week")}
                className={`py-1 px-2.5 mx-1 border border-gray-300 rounded ${
                  view === "week"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-black"
                }`}
              >
                week
              </button>
              <button
                onClick={() => setView("day")}
                className={`py-1 px-2.5 mx-1 border border-gray-300 rounded ${
                  view === "day"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-black"
                }`}
              >
                day
              </button>
            </div>
          </div>
        </div>

        <SimpleCalendar view={view} useSupabase={isAuthenticated} />
      </div>
    </div>
  );
};

// Wrap the app with the AuthProvider
const App = () => {
  return (
    <AuthProvider>
      <CalendarApp />
    </AuthProvider>
  );
};
export default App;
