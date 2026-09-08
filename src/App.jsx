import { useState, useEffect } from "react";
import Login from "./components/Login";
import NeetTracker from "./components/NeetTracker";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const isAuthed = localStorage.getItem("neet_tracker_authed") === "true";
    setAuthed(isAuthed);
    setChecked(true);
  }, []);

  if (!checked) return null;

  return authed
    ? <NeetTracker onLogout={() => setAuthed(false)} />
    : <Login onSuccess={() => setAuthed(true)} />;
}
