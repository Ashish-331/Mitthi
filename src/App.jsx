import { useState, useEffect } from "react";
import Login from "./components/Login";
import NeetTracker from "./components/NeetTracker";
import BingoGame from "./components/BingoGame";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState("mithi");
  const [checked, setChecked] = useState(false);
  const [activePage, setActivePage] = useState("tracker");

  useEffect(() => {
    const isAuthed = localStorage.getItem("neet_tracker_authed") === "true";
    const userRole = localStorage.getItem("neet_tracker_user") || "mithi";
    setAuthed(isAuthed);
    setCurrentUser(userRole);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!authed) {
    return (
      <Login
        onSuccess={(role = "mithi") => {
          setAuthed(true);
          setCurrentUser(role);
        }}
      />
    );
  }

  return activePage === "bingo" ? (
    <BingoGame
      currentUser={currentUser}
      onNavigateToTracker={() => setActivePage("tracker")}
      onLogout={() => {
        localStorage.removeItem("neet_tracker_authed");
        localStorage.removeItem("neet_tracker_user");
        setAuthed(false);
        setActivePage("tracker");
      }}
    />
  ) : (
    <NeetTracker
      currentUser={currentUser}
      onNavigateToBingo={() => setActivePage("bingo")}
      onLogout={() => {
        localStorage.removeItem("neet_tracker_authed");
        localStorage.removeItem("neet_tracker_user");
        setAuthed(false);
        setActivePage("tracker");
      }}
    />
  );
}


