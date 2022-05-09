/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { format } from 'date-fns';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import EVENTS from '../constants/events';
import DB_CONSTANTS from '../constants/db.constants';
import { ProcessCurrentState, ProcessStats } from '../constants/interfaces';

const ExcelJS = require('exceljs');
const sqlite3 = require('sqlite3');

const userDataFolder = app.getPath('userData');

const dbFilePath = path.join(
  userDataFolder,
  DB_CONSTANTS.DB_FOLDER_NAME,
  DB_CONSTANTS.DB_NAME
);

export default class TaxProcessor {
  private mainWindow: BrowserWindow | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any = null;

  private processingId: string | null = null;

  private opFileName: string = '';

  private currentProcessStat: ProcessStats = {
    totalFile: 0,
    currentFile: 0,
    currentState: ProcessCurrentState.STARTING,
  };

  private allInputFiles: string[] = [];

  private currentInputDir: string = '';

  private currentOutputDir: string = '';

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.db = new sqlite3.Database(dbFilePath);
  }

  private log(message: string) {
    this.mainWindow?.webContents.send(EVENTS.ADD_LOG, message);
  }

  private clearLogs() {
    this.mainWindow?.webContents.send(EVENTS.CLEAR_LOGS);
  }

  private sendUpdatedStats() {
    this.mainWindow?.webContents.send(
      EVENTS.UPDATE_STATS,
      this.currentProcessStat
    );
  }

  private sendEvent(eventName: string, data?: any) {
    this.mainWindow?.webContents.send(eventName, data);
  }

  startProcessing(inputFolder: string, outputFolder: string) {
    this.log('Processing starts');
    this.log(`Source Directory -- ${inputFolder}`);
    this.log(`Destination Directory -- ${outputFolder}`);

    this.currentInputDir = inputFolder;
    this.currentOutputDir = outputFolder;

    this.processingId = uuidv4();
    this.opFileName = `${format(new Date(), 'dd_MM_yyyy__hh_mm_ss_bbb')}.xlsx`;

    this.log(`Process id -- ${this.processingId}`);
    this.log(`Output File -- ${this.opFileName}`);

    this.readInitialStat();
    this.startExcelProcessing();
  }

  private readInitialStat() {
    this.log('Reading directory');
    let files = fs.readdirSync(this.currentInputDir);
    files = files.filter((x) => x.endsWith('.xlsx'));

    if (!files.length) {
      this.log('No *.xlsx files in directory');
      this.sendEvent(EVENTS.ERROR.NO_FILES_IN_INP_DIR);
      this.resetAll();
      return;
    }

    this.log(`Total ${files.length} files found`);
    this.currentProcessStat.totalFile = files.length;
    this.currentProcessStat.currentFile = 0;
    this.currentProcessStat.currentState = ProcessCurrentState.READING_DIR;

    this.sendUpdatedStats();

    this.allInputFiles = files;
  }

  stopProcessing() {
    this.log('Processing stops');
    this.resetAll();
  }

  private resetAll() {
    this.currentProcessStat = {
      totalFile: 0,
      currentFile: 0,
      currentState: ProcessCurrentState.STARTING,
    };
    this.processingId = null;
    this.opFileName = '';
    this.allInputFiles = [];

    this.currentInputDir = '';
    this.currentOutputDir = '';

    this.sendUpdatedStats();
  }

  private async startExcelProcessing() {
    for (let i = 0; i < this.allInputFiles.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await this.readFileAndStoreData(this.allInputFiles[i]);
      this.currentProcessStat.currentFile += 1;
      this.currentProcessStat.currentState = ProcessCurrentState.READING_FILES;
      this.sendUpdatedStats();
    }
    this.log('Reading done, now will write output');
    await this.processAndWriteOP();
  }

  private async processAndWriteOP() {
    try {
      this.currentProcessStat.currentState =
        ProcessCurrentState.PROCESSING_DATA;
      this.sendUpdatedStats();
      let allData: any[] = await this.getMultiple(
        `SELECT * from process_data WHERE process_id = '${this.processingId}' ORDER BY id ASC`
      );
      const workbook = new ExcelJS.Workbook();
      const allDataSheet = workbook.addWorksheet('All Data');
      allDataSheet.addRow([
        'GSTIN',
        'Name',
        'Total Taxable',
        'IGST',
        'CGST',
        'SGST',
        'CESS',
      ]);
      for (let i = 0; i < allData.length; i += 1) {
        allDataSheet.addRow([
          allData[i].suppgstin,
          allData[i].suppname,
          allData[i].taxable,
          allData[i].igst,
          allData[i].cgst,
          allData[i].sgst,
          allData[i].cess,
        ]);
      }
      allData = [];
      const opSheet = workbook.addWorksheet('Output');
      opSheet.addRow(['GSTIN', 'Name', 'IGST', 'CGST', 'SGST', 'CESS']);
      allData = await this.getMultiple(
        `SELECT suppgstin, suppname, SUM(igst) AS igst, SUM(cgst) AS cgst, SUM(sgst) AS sgst, SUM(cess) AS cess  from process_data WHERE process_id = "${this.processingId}" GROUP BY suppgstin, suppname`
      );

      for (let i = 0; i < allData.length; i += 1) {
        opSheet.addRow([
          allData[i].suppgstin,
          allData[i].suppname,
          allData[i].igst,
          allData[i].cgst,
          allData[i].sgst,
          allData[i].cess,
        ]);
      }
      allData = [];
      await workbook.xlsx.writeFile(
        path.join(this.currentOutputDir, this.opFileName)
      );
      this.currentProcessStat.currentState = ProcessCurrentState.WRITING_OP;
      this.sendUpdatedStats();
      this.currentProcessStat.currentState = ProcessCurrentState.FINISHED;
      this.sendUpdatedStats();
      this.log('All Done');
    } catch (error) {
      console.log(error);
    }
  }

  private async readFileAndStoreData(filePath: string) {
    const fullFilePath = path.join(this.currentInputDir, filePath);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(fullFilePath);
    const fileParts = filePath.split('_').filter((x) => !!x);
    const recpgstin = fileParts[0];
    const year = parseInt(fileParts[1].slice(-4), 10);
    const month = parseInt(fileParts[1].slice(0, -4), 10);

    this.log(`Processing ${filePath}`);

    const sheet = workbook.getWorksheet(1);
    const effectiveRowStarts = 8;
    const lastRow = sheet.rowCount;

    const lastSuppDetails = {
      suppgstin: null,
      suppname: null,
    };
    const data = [];
    for (let i = effectiveRowStarts; i < lastRow; i += 1) {
      if (!lastSuppDetails.suppname || !lastSuppDetails.suppgstin) {
        lastSuppDetails.suppgstin = sheet.getCell(i, 1).value;
        lastSuppDetails.suppname = sheet.getCell(i, 2).value;
      }
      if (sheet.getRow(i).actualCellCount === 0) {
        lastSuppDetails.suppgstin = null;
        lastSuppDetails.suppname = null;
      } else {
        data.push([
          recpgstin,
          lastSuppDetails.suppgstin,
          this.processingId,
          lastSuppDetails.suppname,
          parseFloat(sheet.getCell(i, 10).value),
          parseFloat(sheet.getCell(i, 11).value),
          parseFloat(sheet.getCell(i, 12).value),
          parseFloat(sheet.getCell(i, 13).value),
          parseFloat(sheet.getCell(i, 9).value),
          month,
          year,
          sheet.getCell(i, 5).value,
          parseFloat(sheet.getCell(i, 6).value),
          sheet.getCell(i, 4).value,
        ]);
      }
    }
    try {
      await this.insertMultiple(data);
    } catch (e) {
      console.log(e);
    }
    this.log(
      `Processed ${filePath}, total ${lastRow - effectiveRowStarts} rows done`
    );
  }

  private async insertMultiple(data: any[]) {
    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('DB null'));
      }
      this.db.serialize(() => {
        const stmt = this.db.prepare(
          'INSERT INTO process_data (id, recpgstin, suppgstin, process_id, suppname, igst, cgst, sgst, cess, taxable,  month, year, invoicedate, invoicevalue, invoiceno) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        for (let i = 0; i < data.length; i += 1) {
          stmt.run(null, ...data[i]);
        }
        stmt.finalize((error: any) => {
          if (error) {
            return reject(error);
          }
          return resolve(true);
        });
      });
    });
  }

  private async getMultiple(query: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.db.all(query, (error: any, rows: any[]) => {
          if (error) {
            return reject(error);
          }
          return resolve(rows);
        });
      });
    });
  }
}
