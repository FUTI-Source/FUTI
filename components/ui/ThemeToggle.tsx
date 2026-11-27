"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark-mode"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark-mode", next);
    if (next) {
      document.documentElement.setAttribute("dark", "");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("dark");
      localStorage.removeItem("theme");
    }
  };

  return (
    <button
      className="toggle-theme"
      onClick={toggle}
      aria-label={dark ? "Enable light mode" : "Enable dark mode"}
      title={dark ? "Enable light mode" : "Enable dark mode"}
    >
      <span className="toggle-moon" aria-hidden="true">
        <Moon />
      </span>
      <span className="toggle-sun" aria-hidden="true">
        <Sun />
      </span>
    </button>
  );
}
