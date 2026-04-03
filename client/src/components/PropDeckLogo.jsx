import React from 'react';

const PropDeckLogo = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    {/* Three-blade propeller */}
    <g transform="translate(50, 50)">
      {/* Blade 1 - top */}
      <path
        d="M-3,-8 C-5,-20 -8,-38 -2,-42 C4,-46 10,-32 8,-18 C6,-12 3,-8 0,-8 Z"
        fill="var(--accent, #d26cff)"
        opacity="0.9"
      />
      {/* Blade 2 - bottom right */}
      <path
        d="M-3,-8 C-5,-20 -8,-38 -2,-42 C4,-46 10,-32 8,-18 C6,-12 3,-8 0,-8 Z"
        fill="var(--accent, #d26cff)"
        transform="rotate(120)"
      />
      {/* Blade 3 - bottom left */}
      <path
        d="M-3,-8 C-5,-20 -8,-38 -2,-42 C4,-46 10,-32 8,-18 C6,-12 3,-8 0,-8 Z"
        fill="var(--accent, #d26cff)"
        opacity="0.8"
        transform="rotate(240)"
      />
      {/* Centre hub */}
      <circle cx="0" cy="0" r="5" fill="var(--accent, #d26cff)" />
      <circle cx="0" cy="0" r="2.5" fill="var(--bg, #0a0a0a)" />
    </g>
  </svg>
);

export default PropDeckLogo;
