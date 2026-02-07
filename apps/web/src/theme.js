import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#ff6f61',
      dark: '#e85b50',
      light: '#ff9a8f'
    },
    secondary: {
      main: '#6c63ff',
      light: '#9a94ff',
      dark: '#554bd9'
    },
    background: {
      default: '#eef4fb',
      paper: '#ffffff'
    },
    text: {
      primary: '#1f2552',
      secondary: '#5f6b82'
    },
    success: {
      main: '#2dbf7b'
    },
    warning: {
      main: '#f2b65b'
    },
    error: {
      main: '#f06a6a'
    },
    info: {
      main: '#6ea8fe'
    }
  },
  typography: {
    fontFamily: '"Poppins", system-ui, -apple-system, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h2: {
      fontWeight: 700
    },
    h3: {
      fontWeight: 600
    },
    h4: {
      fontWeight: 600
    },
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 6
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '10px 22px'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: '0 18px 40px rgba(31, 37, 82, 0.08)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: '0 20px 45px rgba(31, 37, 82, 0.08)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600
        }
      }
    }
  }
});

export default theme;
