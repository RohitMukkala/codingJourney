import React from "react";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import { Menu } from "lucide-react";

function Header({ onMenuClick }) {
  const { user, isSignedIn } = useUser();

  return (
    <div
      className="p-3 px-5 flex justify-between items-center shadow-md relative z-[60] text-white"
      style={{ backgroundColor: "#111827" }}
    >
      <div className="flex items-center gap-4">
        {isSignedIn && (
          <button
            className="block text-white hover:text-gray-300 focus:outline-none"
            onClick={onMenuClick}
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <Link to={"/dashboard"}>
          <img
            src="one.png"
            width={90}
            height={25}
            style={{ borderRadius: "10px" }}
            alt="Curved Image"
          />
        </Link>
      </div>

      {isSignedIn ? (
        <div className="flex gap-2 items-center">
          <Link to={"/dashboard"}>
            {/* This is the changed line */}
            <Button variant="ghost">Dashboard</Button>
          </Link>
          <UserButton />
        </div>
      ) : (
        <Link to={"/auth/sign-in"}>
          <Button>Get Started</Button>
        </Link>
      )}
    </div>
  );
}

export default Header;
