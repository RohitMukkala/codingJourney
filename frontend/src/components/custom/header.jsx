import React from "react";
import { Button } from "../ui/button";
function Header() {
  return (
    <div className="p-3 px-5 flex justify-between shadow-md">
      <img
        src="one.png"
        width={90}
        height={25}
        style={{ borderRadius: "10px" }}
        alt="Curved Image"
      />
      <Button>Get Started</Button>
    </div>
  );
}

export default Header;
