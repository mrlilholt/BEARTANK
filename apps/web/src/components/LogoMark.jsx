import { useState } from 'react';
import { Box } from '@mui/material';

const sources = ['/beartankLogo1.svg', '/beartankLogo1.png', '/logo.svg', '/logo.png'];

export default function LogoMark({ size = 64 }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (index < sources.length - 1) {
      setIndex((prev) => prev + 1);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: 0,
          background: 'linear-gradient(135deg, #ff8a00 0%, #ff6b6b 100%)',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          color: '#0f1b2d'
        }}
      >
        BT
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={sources[index]}
      alt="BEARTANK"
      onError={handleError}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: 0
      }}
    />
  );
}
