/* eslint-disable react/no-array-index-key */
import {
  Box,
  Button,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import React, { useEffect, useState } from 'react';
import EVENTS from '../constants/events';
import {
  CurrentState,
  Logs,
  ProcessCurrentState,
  ProcessStats,
} from '../constants/interfaces';

function Home() {
  const [currentState, setCurrentState] = useState<CurrentState>(
    CurrentState.INPUT
  );
  const [outputDirectory, setOutputDirectory] = useState('');
  const [inputDirectory, setInputDirectory] = useState('');
  const [logs, setLogs] = useState<Logs[]>([]);

  const { enqueueSnackbar } = useSnackbar();

  const [currentProcessStat, setCurrentProcessStat] = useState<ProcessStats>({
    totalFile: 0,
    currentFile: 0,
    currentState: ProcessCurrentState.STARTING,
  });
  useEffect(() => {
    if (logs && logs.length) {
      const logPanel = document.getElementById('log_panel');
      if (logPanel) {
        logPanel.scrollTop = logPanel.scrollHeight;
      }
    }
  }, [logs]);
  useEffect(() => {
    window.electron.ipcRenderer.on(
      EVENTS.OPEN_SOURCE_CHOOSER_RESULT,
      async (data: any) => {
        if (data && !data.canceled && data.filePaths && data.filePaths.length) {
          enqueueSnackbar('Source selected', {
            variant: 'success',
          });
          setCurrentState(CurrentState.OUTPUT);
          setOutputDirectory(data.filePaths[0]);
          setInputDirectory(data.filePaths[0]);
        } else {
          enqueueSnackbar('No source folder selected!', {
            variant: 'error',
          });
        }
      }
    );
    window.electron.ipcRenderer.on(
      EVENTS.OPEN_DESTINATION_CHOOSER_RESULT,
      async (data: any) => {
        if (data && !data.canceled && data.filePaths && data.filePaths.length) {
          setCurrentState(CurrentState.OUTPUT);
          setOutputDirectory(data.filePaths[0]);
        }
      }
    );
    window.electron.ipcRenderer.on(EVENTS.ADD_LOG, async (data: any) => {
      console.log('Adding log ---- ', data);
      if (data) {
        const logObj: Logs = {
          data,
          date: format(new Date(), 'Pp'),
        };
        const oldLogs = logs;
        if (oldLogs.length > 1000) {
          oldLogs.splice(0, 1);
          oldLogs.push(logObj);
        } else {
          oldLogs.push(logObj);
        }
        setLogs([...oldLogs]);
      }
    });
    window.electron.ipcRenderer.on(EVENTS.CLEAR_LOGS, async (data: any) => {
      setLogs([]);
    });
    window.electron.ipcRenderer.on(EVENTS.UPDATE_STATS, async (data: any) => {
      setCurrentProcessStat(data);
      if (data.currentState === ProcessCurrentState.FINISHED) {
        enqueueSnackbar('Done, you can close and start processing next', {
          variant: 'info',
        });
        setCurrentState(CurrentState.DONE);
      }
    });
  }, []);
  const openFileChooser = () => {
    window.electron.ipcRenderer.sendMessage(EVENTS.OPEN_SOURCE_CHOOSER, []);
  };

  const openOutputFileChooser = () => {
    window.electron.ipcRenderer.sendMessage(
      EVENTS.OPEN_DESTINATION_CHOOSER,
      []
    );
  };
  const startProcessing = () => {
    window.electron.ipcRenderer.sendMessage(EVENTS.START_PROCESSING, [
      inputDirectory,
      outputDirectory,
    ]);
    setCurrentState(CurrentState.PROCESSING);
  };
  const stopProcessing = () => {
    window.electron.ipcRenderer.sendMessage(EVENTS.CANCEL_PROCESSING, []);
    setCurrentState(CurrentState.INPUT);
  };
  return (
    <Box sx={{ width: '100%', minHeight: '100vh' }}>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant="h5" component="h1">
                Excel processor
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.32))',
              }}
            >
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1">Source Directory</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" align="left">
                    {currentState >= CurrentState.OUTPUT
                      ? inputDirectory
                      : 'Choose Source Folder'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    disabled={currentState > CurrentState.OUTPUT}
                    onClick={openFileChooser}
                    variant="outlined"
                    color="primary"
                  >
                    Select
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          {currentState >= CurrentState.OUTPUT ? (
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.32))',
                }}
              >
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">
                      Destination Directory
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h6">{outputDirectory}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      disabled={currentState > CurrentState.OUTPUT}
                      onClick={openOutputFileChooser}
                      variant="outlined"
                      color="primary"
                    >
                      Change
                    </Button>
                  </Grid>
                  <Grid
                    item
                    xs={6}
                    sx={{
                      textAlign: 'right',
                    }}
                  >
                    <Button
                      disabled={currentState > CurrentState.OUTPUT}
                      onClick={startProcessing}
                      variant="contained"
                      color="primary"
                    >
                      Start
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ) : null}
          {currentState >= CurrentState.PROCESSING ? (
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.32))',
                }}
              >
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Task Status</Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <LinearProgress
                          variant={
                            currentState === CurrentState.PROCESSING
                              ? 'indeterminate'
                              : 'determinate'
                          }
                          value={100}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle1">
                          {currentProcessStat.currentFile}/
                          {currentProcessStat.totalFile}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid
                    item
                    xs={4}
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                    }}
                  >
                    <Button
                      variant="contained"
                      color={
                        currentProcessStat.currentState ===
                        ProcessCurrentState.FINISHED
                          ? 'primary'
                          : 'warning'
                      }
                      onClick={stopProcessing}
                    >
                      {currentProcessStat.currentState ===
                      ProcessCurrentState.FINISHED
                        ? 'Close'
                        : 'Cancel'}
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider />
                    <Typography variant="subtitle1">Logs</Typography>
                    <Paper
                      elevation={0}
                      sx={{
                        display: 'flex',
                        flex: 1,
                        background: '#263238',
                        flexDirection: 'column',
                        height: '140px',
                        padding: 1,
                        overflowY: 'scroll',
                      }}
                      id="log_panel"
                    >
                      {logs && logs.length ? (
                        logs.map((log, index) => {
                          return (
                            <Box
                              key={index}
                              sx={{
                                display: 'flex',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                flexDirection: 'row',
                              }}
                            >
                              <Typography
                                sx={{
                                  color: '#64DD17',
                                }}
                                variant="subtitle2"
                              >
                                [{log.date}]&nbsp;
                              </Typography>
                              <Typography
                                sx={{
                                  color: '#64DD17',
                                }}
                                variant="subtitle2"
                              >
                                {log.data}
                              </Typography>
                            </Box>
                          );
                        })
                      ) : (
                        <Typography
                          sx={{
                            color: '#64DD17',
                          }}
                          variant="subtitle2"
                        >
                          No Logs Available!
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ) : null}
        </Grid>
      </Box>
    </Box>
  );
}

export default Home;
