/**
 * GOOGLE SHEETS & APPS SCRIPT SECONDARY BACKUP SYSTEM
 * Provides real-time synchronization, manual push/pull disaster recovery,
 * and automated backups to Google Sheets using a Google Apps Script Web App.
 */

import { User, SubscriptionCode, SystemSettings, SupportMessage } from '../types';
import { getSystemSettings, getAllUsers, getSubscriptionCodes } from '../utils/storage';

const GOOGLE_SHEETS_SCRIPT_KEY = 'zinovis_google_sheets_script_url';
const GOOGLE_SHEETS_AUTO_BACKUP_KEY = 'zinovis_google_sheets_auto_backup';

export interface GoogleSheetsStatusResult {
  connected: boolean;
  message: string;
  latency?: string;
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
  timestamp?: number;
  stats?: {
    usersCount?: number;
    codesCount?: number;
    settingsUpdated?: boolean;
    messagesCount?: number;
  };
}

export interface GoogleSheetsRestoreData {
  users?: User[];
  subscriptionCodes?: SubscriptionCode[];
  settings?: Partial<SystemSettings>;
}

const DEFAULT_GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwROExizYYExM0ZfiyQvPKH2wRleazEc68zv_FUtQYHuP6bqUPImi5sD0WYokBdPat6/exec';

/**
 * Returns the currently active Google Apps Script Web App URL
 */
export function getGoogleSheetsScriptUrl(): string {
  try {
    const settings = getSystemSettings();
    if (settings.googleSheetsScriptUrl?.trim()) {
      return settings.googleSheetsScriptUrl.trim();
    }
  } catch {}
  return localStorage.getItem(GOOGLE_SHEETS_SCRIPT_KEY) || DEFAULT_GOOGLE_APPS_SCRIPT_URL;
}

/**
 * Saves the Google Apps Script Web App URL locally
 */
export function setGoogleSheetsScriptUrl(url: string): void {
  const cleanUrl = url.trim();
  if (cleanUrl) {
    localStorage.setItem(GOOGLE_SHEETS_SCRIPT_KEY, cleanUrl);
  } else {
    localStorage.removeItem(GOOGLE_SHEETS_SCRIPT_KEY);
  }
}

/**
 * Check whether auto-backup to Google Sheets is enabled
 */
export function isGoogleSheetsAutoBackupEnabled(): boolean {
  try {
    const settings = getSystemSettings();
    if (typeof settings.googleSheetsAutoBackup === 'boolean') {
      return settings.googleSheetsAutoBackup;
    }
  } catch {}
  const localVal = localStorage.getItem(GOOGLE_SHEETS_AUTO_BACKUP_KEY);
  if (localVal !== null) {
    return localVal === 'true';
  }
  return true;
}

/**
 * Toggle auto-backup setting
 */
export function setGoogleSheetsAutoBackup(enabled: boolean): void {
  localStorage.setItem(GOOGLE_SHEETS_AUTO_BACKUP_KEY, enabled ? 'true' : 'false');
}

/**
 * Check if the Google Sheets Backup system is configured with a URL
 */
export function isGoogleSheetsConfigured(): boolean {
  return !!getGoogleSheetsScriptUrl();
}

/**
 * Test connectivity with the Google Apps Script Web App endpoint
 */
export async function testGoogleSheetsConnection(scriptUrl?: string): Promise<GoogleSheetsStatusResult> {
  const url = (scriptUrl || getGoogleSheetsScriptUrl()).trim();
  if (!url) {
    return {
      connected: false,
      message: 'No Google Apps Script Web App URL provided.'
    };
  }

  const startTime = Date.now();
  try {
    // Note: Google Apps Script Web Apps handle POST via redirect.
    // Using text/plain prevents CORS preflight issues in browser environments.
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'ping',
        app: 'Zinovis Cloud Streaming Service',
        timestamp: Date.now()
      })
    });

    const latency = `${Date.now() - startTime}ms`;

    if (!response.ok && response.type !== 'opaque') {
      return {
        connected: false,
        message: `HTTP ${response.status}: Failed to communicate with Google Apps Script. Check deployment settings.`,
        latency
      };
    }

    try {
      const data = await response.json();
      if (data && (data.status === 'ok' || data.success)) {
        return {
          connected: true,
          message: data.message || 'Successfully connected to Google Spreadsheet backend!',
          latency,
          spreadsheetTitle: data.spreadsheetTitle,
          spreadsheetUrl: data.spreadsheetUrl,
          timestamp: data.timestamp || Date.now()
        };
      }
    } catch {
      // If response is opaque or plain text but ok
      if (response.ok) {
        return {
          connected: true,
          message: 'Connected to Google Apps Script Webhook (Response received).',
          latency
        };
      }
    }

    return {
      connected: true,
      message: 'Connected to Google Apps Script endpoint.',
      latency
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err?.message || 'Failed to reach Google Apps Script. Ensure the Web App is deployed with "Anyone" access.',
      latency: `${Date.now() - startTime}ms`
    };
  }
}

/**
 * Push full snapshot of database (users, subscription passes, settings, support messages)
 * to Google Sheets.
 */
export async function pushBackupToGoogleSheets(
  scriptUrl?: string,
  customData?: {
    users?: User[];
    codes?: SubscriptionCode[];
    settings?: SystemSettings;
    supportMessages?: SupportMessage[];
  }
): Promise<{ success: boolean; message: string; stats?: any; error?: string }> {
  const url = (scriptUrl || getGoogleSheetsScriptUrl()).trim();
  if (!url) {
    return { success: false, message: 'Google Apps Script URL is not configured.', error: 'No URL' };
  }

  const users = customData?.users || getAllUsers();
  const codes = customData?.codes || getSubscriptionCodes();
  const settings = customData?.settings || getSystemSettings();
  const supportMessages = customData?.supportMessages || [];

  const payload = {
    action: 'backupAll',
    app: 'Zinovis Cloud Streaming Service',
    timestamp: Date.now(),
    data: {
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        country: u.country || 'Global',
        age: u.age || '',
        isUnder18: u.isUnder18 ? 'Yes' : 'No',
        joinedDate: new Date(u.joinedAt).toISOString(),
        subscriptionTier: u.subscription?.tier || 'Free Tier',
        subscriptionExpires: u.subscription?.expiresAt ? new Date(u.subscription.expiresAt).toISOString() : (u.subscription?.isPermanent ? 'Permanent VIP' : 'None'),
        watchHistoryCount: u.watchHistory?.length || 0,
        watchLaterCount: u.watchLater?.length || 0
      })),
      subscriptionCodes: codes.map(c => ({
        id: c.id,
        code: c.code,
        tier: c.tier,
        durationDays: c.durationDays,
        isRedeemed: c.isRedeemed ? 'Redeemed' : 'Active (Available)',
        redeemedBy: c.redeemedBy ? `${c.redeemedBy.userName} (${c.redeemedBy.userEmail})` : '',
        redeemedAt: c.redeemedAt ? new Date(c.redeemedAt).toISOString() : '',
        createdAt: new Date(c.createdAt).toISOString(),
        note: c.note || ''
      })),
      settings: {
        subscriptionRequired: settings.subscriptionRequired ? 'Yes' : 'No',
        shopUrl: settings.shopUrl,
        lastUpdated: new Date(settings.updatedAt || Date.now()).toISOString()
      },
      supportMessages: supportMessages.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.userName,
        userEmail: m.userEmail,
        sender: m.sender,
        message: m.message,
        read: m.read ? 'Yes' : 'No',
        createdAt: new Date(m.createdAt).toISOString()
      }))
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok && response.type !== 'opaque') {
      return {
        success: false,
        message: `Google Sheets returned HTTP error status: ${response.status}`,
        error: `HTTP ${response.status}`
      };
    }

    try {
      const result = await response.json();
      return {
        success: true,
        message: result.message || `Successfully synced ${users.length} user(s) and ${codes.length} VIP code(s) to Google Sheets!`,
        stats: result.stats || { usersCount: users.length, codesCount: codes.length }
      };
    } catch {
      return {
        success: true,
        message: `Backup data dispatched to Google Sheets (${users.length} users, ${codes.length} codes).`,
        stats: { usersCount: users.length, codesCount: codes.length }
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to push backup to Google Sheets: ${err?.message || 'Network error'}`,
      error: err?.message
    };
  }
}

/**
 * Fetch backup snapshot from Google Sheets for disaster recovery
 */
export async function fetchBackupFromGoogleSheets(scriptUrl?: string): Promise<{ success: boolean; data?: GoogleSheetsRestoreData; message: string; error?: string }> {
  const url = (scriptUrl || getGoogleSheetsScriptUrl()).trim();
  if (!url) {
    return { success: false, message: 'Google Apps Script URL is not configured.', error: 'No URL' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'getBackupData',
        app: 'Zinovis Cloud Streaming Service',
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP error ${response.status} when fetching Google Sheets backup.`,
        error: `HTTP ${response.status}`
      };
    }

    const res = await response.json();
    if (res && res.success && res.data) {
      return {
        success: true,
        data: res.data,
        message: `Retrieved ${res.data.users?.length || 0} user(s) and ${res.data.subscriptionCodes?.length || 0} code(s) from Google Sheets!`
      };
    }

    return {
      success: false,
      message: res.message || 'No valid backup structure found in Google Sheet.',
      error: 'Invalid structure'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to retrieve backup from Google Sheets: ${err?.message || 'Check Script deployment'}`,
      error: err?.message
    };
  }
}

/**
 * Non-blocking incremental sync for a single user (called on signup or profile update)
 */
export function dispatchUserToGoogleSheets(user: User): void {
  if (!isGoogleSheetsAutoBackupEnabled() || !isGoogleSheetsConfigured()) return;
  
  const url = getGoogleSheetsScriptUrl();
  if (!url) return;

  // Run in background without blocking UI
  setTimeout(async () => {
    try {
      await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'upsertUser',
          timestamp: Date.now(),
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            country: user.country || 'Global',
            age: user.age || '',
            isUnder18: user.isUnder18 ? 'Yes' : 'No',
            joinedDate: new Date(user.joinedAt).toISOString(),
            subscriptionTier: user.subscription?.tier || 'Free Tier',
            subscriptionExpires: user.subscription?.expiresAt ? new Date(user.subscription.expiresAt).toISOString() : (user.subscription?.isPermanent ? 'Permanent VIP' : 'None'),
            watchHistoryCount: user.watchHistory?.length || 0,
            watchLaterCount: user.watchLater?.length || 0
          }
        })
      });
    } catch {}
  }, 100);
}

/**
 * Complete, copy-paste ready Google Apps Script code for the user's Spreadsheet
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * ZINOVIS STREAMING ENGINE - GOOGLE SHEETS BACKUP & RECOVERY WEB APP
 * =========================================================================
 * 
 * INSTRUCTIONS TO DEPLOY (Takes ~30 seconds):
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Rename the Spreadsheet to "Zinovis Streaming Cloud Backup"
 * 3. In the menu, click: Extensions > Apps Script
 * 4. Delete any code in Code.gs and paste THIS entire script file.
 * 5. Click "Deploy" > "New deployment"
 * 6. Under "Select type", choose "Web app"
 * 7. Set:
 *    - Description: "Zinovis Backup Webhook"
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone" (Required so your app can sync data)
 * 8. Click "Deploy", authorize permissions, and COPY the Web App URL.
 * 9. Paste the Web App URL into the Zinovis Admin Panel > Google Sheets Backup!
 */

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  var output = { success: false, status: 'error', timestamp: new Date().getTime() };
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var params = {};

    if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = {};
      }
    } else if (e && e.parameter) {
      params = e.parameter;
    }

    var action = params.action || (e && e.parameter && e.parameter.action) || 'ping';

    // 1. HEALTH PING
    if (action === 'ping') {
      output = {
        success: true,
        status: 'ok',
        message: 'Zinovis Google Sheets Backup System is online and healthy!',
        spreadsheetTitle: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        timestamp: new Date().getTime()
      };
    }
    // 2. FULL DATABASE BACKUP
    else if (action === 'backupAll') {
      var data = params.data || {};
      var stats = { usersCount: 0, codesCount: 0, settingsUpdated: false, messagesCount: 0 };

      // A. Backup Users
      if (data.users && Array.isArray(data.users)) {
        var usersSheet = getOrCreateSheet(ss, 'Users', [
          'User ID', 'Username', 'Full Name', 'Email', 'Country', 'Age', 
          'Under 18', 'Joined Date', 'Subscription Tier', 'VIP Expiration', 
          'History Count', 'Watchlist Count', 'Last Synced'
        ], '#1e293b');

        var userRows = data.users.map(function(u) {
          return [
            u.id || '',
            u.username || '',
            u.name || '',
            u.email || '',
            u.country || '',
            u.age || '',
            u.isUnder18 || 'No',
            u.joinedDate || '',
            u.subscriptionTier || 'Free Tier',
            u.subscriptionExpires || 'None',
            u.watchHistoryCount || 0,
            u.watchLaterCount || 0,
            new Date().toISOString()
          ];
        });

        if (userRows.length > 0) {
          clearSheetRowsPreserveHeader(usersSheet);
          usersSheet.getRange(2, 1, userRows.length, userRows[0].length).setValues(userRows);
          stats.usersCount = userRows.length;
        }
      }

      // B. Backup VIP Passcodes
      if (data.subscriptionCodes && Array.isArray(data.subscriptionCodes)) {
        var codesSheet = getOrCreateSheet(ss, 'Subscription_Codes', [
          'Code ID', 'Passcode Key', 'Tier', 'Duration (Days)', 
          'Status', 'Redeemed By', 'Redeemed Date', 'Created Date', 'Notes', 'Last Synced'
        ], '#831843');

        var codeRows = data.subscriptionCodes.map(function(c) {
          return [
            c.id || '',
            c.code || '',
            c.tier || '',
            c.durationDays || 0,
            c.isRedeemed || 'Active',
            c.redeemedBy || '',
            c.redeemedAt || '',
            c.createdAt || '',
            c.note || '',
            new Date().toISOString()
          ];
        });

        if (codeRows.length > 0) {
          clearSheetRowsPreserveHeader(codesSheet);
          codesSheet.getRange(2, 1, codeRows.length, codeRows[0].length).setValues(codeRows);
          stats.codesCount = codeRows.length;
        }
      }

      // C. Backup System Settings
      if (data.settings) {
        var settingsSheet = getOrCreateSheet(ss, 'Settings', [
          'Setting Key', 'Value', 'Last Updated'
        ], '#065f46');

        clearSheetRowsPreserveHeader(settingsSheet);
        var settingRows = [
          ['Subscription Gate Required', data.settings.subscriptionRequired || 'No', new Date().toISOString()],
          ['VIP Store Shop URL', data.settings.shopUrl || '', new Date().toISOString()],
          ['Last Engine Backup Timestamp', new Date().toISOString(), new Date().toISOString()]
        ];
        settingsSheet.getRange(2, 1, settingRows.length, settingRows[0].length).setValues(settingRows);
        stats.settingsUpdated = true;
      }

      // D. Backup Support Messages
      if (data.supportMessages && Array.isArray(data.supportMessages)) {
        var supportSheet = getOrCreateSheet(ss, 'Support_Tickets', [
          'Message ID', 'User ID', 'User Name', 'Email', 'Sender', 'Message Text', 'Read Status', 'Created Date'
        ], '#312e81');

        var msgRows = data.supportMessages.map(function(m) {
          return [
            m.id || '',
            m.userId || '',
            m.userName || '',
            m.userEmail || '',
            m.sender || 'user',
            m.message || '',
            m.read || 'No',
            m.createdAt || ''
          ];
        });

        if (msgRows.length > 0) {
          clearSheetRowsPreserveHeader(supportSheet);
          supportSheet.getRange(2, 1, msgRows.length, msgRows[0].length).setValues(msgRows);
          stats.messagesCount = msgRows.length;
        }
      }

      // Log Backup Activity
      logBackupActivity(ss, 'Full Backup', 'Synced ' + stats.usersCount + ' users, ' + stats.codesCount + ' codes.');

      output = {
        success: true,
        status: 'ok',
        message: 'Snapshot backed up successfully to Google Sheets!',
        stats: stats,
        spreadsheetUrl: ss.getUrl(),
        timestamp: new Date().getTime()
      };
    }
    // 3. SINGLE USER UPSERT (REAL-TIME AUTO BACKUP)
    else if (action === 'upsertUser' && params.user) {
      var u = params.user;
      var uSheet = getOrCreateSheet(ss, 'Users', [
        'User ID', 'Username', 'Full Name', 'Email', 'Country', 'Age', 
        'Under 18', 'Joined Date', 'Subscription Tier', 'VIP Expiration', 
        'History Count', 'Watchlist Count', 'Last Synced'
      ], '#1e293b');

      var foundRow = -1;
      var lastRow = uSheet.getLastRow();
      if (lastRow > 1) {
        var userIds = uSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < userIds.length; i++) {
          if (userIds[i][0] === u.id || (u.email && userIds[i][3] === u.email)) {
            foundRow = i + 2;
            break;
          }
        }
      }

      var userRowData = [
        u.id || '',
        u.username || '',
        u.name || '',
        u.email || '',
        u.country || '',
        u.age || '',
        u.isUnder18 || 'No',
        u.joinedDate || '',
        u.subscriptionTier || 'Free Tier',
        u.subscriptionExpires || 'None',
        u.watchHistoryCount || 0,
        u.watchLaterCount || 0,
        new Date().toISOString()
      ];

      if (foundRow > 1) {
        uSheet.getRange(foundRow, 1, 1, userRowData.length).setValues([userRowData]);
      } else {
        uSheet.appendRow(userRowData);
      }

      output = { success: true, message: 'User updated in Google Sheets' };
    }
    // 4. RETRIEVE BACKUP DATA (DISASTER RECOVERY / RESTORE)
    else if (action === 'getBackupData') {
      var restoredUsers = [];
      var restoredCodes = [];

      var uSheetObj = ss.getSheetByName('Users');
      if (uSheetObj && uSheetObj.getLastRow() > 1) {
        var uValues = uSheetObj.getRange(2, 1, uSheetObj.getLastRow() - 1, 12).getValues();
        for (var k = 0; k < uValues.length; k++) {
          var row = uValues[k];
          if (row[0]) {
            restoredUsers.push({
              id: String(row[0]),
              username: String(row[1] || 'user'),
              name: String(row[2] || 'User'),
              email: String(row[3] || ''),
              country: String(row[4] || 'Global'),
              age: row[5] ? Number(row[5]) : undefined,
              isUnder18: row[6] === 'Yes',
              joinedAt: row[7] ? new Date(row[7]).getTime() : new Date().getTime(),
              subscription: row[8] && row[8] !== 'Free Tier' ? {
                tier: row[8],
                startDate: new Date().getTime(),
                expiresAt: row[9] === 'Permanent VIP' ? null : (row[9] ? new Date(row[9]).getTime() : null),
                isPermanent: row[9] === 'Permanent VIP'
              } : undefined,
              watchHistory: [],
              watchLater: []
            });
          }
        }
      }

      output = {
        success: true,
        status: 'ok',
        data: {
          users: restoredUsers,
          subscriptionCodes: restoredCodes
        },
        message: 'Backup data retrieved successfully'
      };
    }

  } catch (err) {
    output = {
      success: false,
      status: 'error',
      message: err.toString(),
      timestamp: new Date().getTime()
    };
  }

  var response = ContentService.createTextOutput(JSON.stringify(output));
  response.setMimeType(ContentService.MimeType.JSON);
  return response;
}

function getOrCreateSheet(ss, name, headers, headerColor) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground(headerColor || '#0f172a');
      headerRange.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function clearSheetRowsPreserveHeader(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1 && lastCol > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
}

function logBackupActivity(ss, type, details) {
  try {
    var logSheet = getOrCreateSheet(ss, 'Backup_Logs', ['Timestamp', 'Event Type', 'Details'], '#334155');
    logSheet.appendRow([new Date().toISOString(), type, details]);
  } catch (e) {}
}
`;
