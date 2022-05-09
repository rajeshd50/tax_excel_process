import { createTheme, ThemeOptions } from '@mui/material/styles';

const themeOptions: ThemeOptions = {
  palette: {
    primary: {
      main: '#464EB8',
    },
    secondary: {
      main: '#8e24aa',
    },
    error: {
      main: '#e53935',
    },
    info: {
      main: '#00b0ff',
    },
  },
  components: {
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 42,
          height: 26,
          padding: 0,
          margin: 8,
        },
        switchBase: {
          padding: 1,
          '&$checked, &$colorPrimary$checked, &$colorSecondary$checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + $track': {
              opacity: 1,
              border: 'none',
            },
          },
        },
        thumb: {
          width: 24,
          height: 24,
        },
        track: {
          borderRadius: 13,
          border: '1px solid #bdbdbd',
          backgroundColor: '#fafafa',
          opacity: 1,
          transition:
            'background-color 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          lineHeight: '16px',
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: '48px',
          '&.MuiButtonBase-root.Mui-expanded': {
            minHeight: '48px',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            height: '48px',
          },
          '& .MuiInputBase-input': {
            height: '32px',
            padding: '8px 8px',
          },
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        select: {
          paddingBottom: 'initial',
          paddingTop: 'initial',
          minHeight: 'initial',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          '&.MuiTablePagination-toolbar': {
            '& .MuiInputBase-root': {
              '& .MuiTablePagination-select': {
                minHeight: 'initial',
              },
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          paddingTop: '8px',
          paddingBottom: '8px',
          minHeight: '32px',
        },
        outlined: {
          paddingTop: '12px',
          paddingBottom: '4px',
          minHeight: '32px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          height: '36px',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiFormControl-root.MuiTextField-root': {
            '& .MuiInputBase-input': {
              height: 'initial',
            },
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '0 24px 16px 24px',
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          '&:first-letter': {
            textTransform: 'capitalize',
          },
        },
      },
    },
  },
};

const theme = createTheme(themeOptions);

export default theme;
