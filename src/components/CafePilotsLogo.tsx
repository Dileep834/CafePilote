import React from 'react';
import { Box, useTheme } from '@mui/material';

interface CafePilotsLogoProps {
  size?: number;
  colored?: boolean;
}

export const CafePilotsLogo: React.FC<CafePilotsLogoProps> = ({ 
  size = 64,
  colored = true
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  // The primary brand color is Orange. Cup body is Navy (light mode) or White (dark mode).
  const propellerColor = colored ? '#FF7A00' : 'currentColor';
  const cupColor = isDark ? '#ffffff' : '#001B2A';

  return (
    <Box 
      component="svg" 
      viewBox="0 0 100 100" 
      sx={{ 
        width: size, 
        height: size,
        display: 'block'
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Propeller Blade Left */}
      <path 
        d="M47 22 C 25 12, 10 20, 15 27 C 25 30, 47 26, 47 22 Z" 
        fill={propellerColor}
      />
      {/* Propeller Blade Right */}
      <path 
        d="M53 22 C 75 12, 90 20, 85 27 C 75 30, 53 26, 53 22 Z" 
        fill={propellerColor}
      />
      
      {/* Propeller Stick */}
      <rect x="46.5" y="12" width="7" height="28" rx="3.5" fill={propellerColor}/>
      
      {/* Propeller Center Hub */}
      <circle cx="50" cy="22" r="5" fill={propellerColor} />

      {/* Coffee Cup Handle */}
      <path 
        d="M75 45 C 95 45, 95 65, 75 65" 
        stroke={cupColor} 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none"
      />

      {/* Coffee Cup Body */}
      <path 
        d="M20 40 L80 40 C 80 68, 65 75, 50 75 C 35 75, 20 68, 20 40 Z" 
        fill={cupColor}
      />
      
      {/* Coffee Liquid Top Curve (adds a nice 3D effect to the cup) */}
      <ellipse cx="50" cy="40" rx="30" ry="4" fill={isDark ? '#e2e8f0' : '#1B263B'} />

      {/* Saucer / Bottom Curve */}
      <path 
        d="M30 85 Q 50 92 70 85" 
        stroke={cupColor} 
        strokeWidth="4" 
        strokeLinecap="round" 
        fill="none"
      />
    </Box>
  );
};
