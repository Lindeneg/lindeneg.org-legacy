import React from "react";
import { globals } from "../globals";

export const Header: React.FC = () => (
  <div className="header">
    <a href="/">{globals.siteName}</a>
    <div className="flex-spacer" />
    <a href="https://github.com/lindeneg" target="_blank" rel="noreferrer">
      github
    </a>
    <a
      href="https://www.npmjs.com/org/lindeneg"
      target="_blank"
      rel="noreferrer"
    >
      npm
    </a>
    <a
      href="https://www.linkedin.com/in/christian-l-954960190/"
      target="_blank"
      rel="noreferrer"
    >
      linkedin
    </a>
  </div>
);
