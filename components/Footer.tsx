import React from 'react';
import { globals } from '../globals';

export const Footer: React.FC = () => (
  <div className="footer">
    <div className="wrapper">
      <p>{`© ${globals.yourName} ${new Date().getFullYear()}`}</p>
      <p>|</p>
      <a href="https://github.com/colinhacks/devii" target="_blank">
        Made with: <span>devii</span>
      </a>
      <p>|</p>
      <a href="https://github.com/colinhacks" target="_blank">
        Credit to: <span>colinhacks</span>
      </a>
    </div>
    <a href="/rss.xml">
      <img src="/img/rss-white.svg" alt="RSS Feed" height="30" width="30" />
    </a>
  </div>
);
