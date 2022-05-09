import { createRoot } from 'react-dom/client';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';

import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import theme from './theme';

import App from './App';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <App />
      </SnackbarProvider>
    </ThemeProvider>
  </StyledEngineProvider>
);

// calling IPC exposed from preload script
window.electron.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
