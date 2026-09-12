/**
 * GOOGLE SHEETS & APPS SCRIPT CLOUD DATA SERVER
 * Provides primary cloud data storage, cross-device synchronization,
 * user authentication, watchlist/history persistence, VIP passcode redemption,
 * and system settings backed by Google Sheets.
 */

import { User, SubscriptionCode, SystemSettings, SupportMessage, WatchHistoryItem, WatchlistItem } from '../types';
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
  supportMessages?: SupportMessage[];
}

export const DEFAULT_GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxmhhr4j8TAX1ev1GOtNOMa2DLD3c-c9y_Dd7IrRsmah1Mi585n58z17BpG8IgyUsGH/exec';

const OUTDATED_URL_KEYS = [
  'AKfycbwROExizYYExM0ZfiyQvPKH2wRleazEc68zv_FUtQYHuP6bqUPImi5sD0WYokBdPat6',
  'AKfycbzOcerndIfkHKkscjWKIZFU-wm6ea01fhTS_a7p7UrNXkhYA0Y0BRCgHEmo81d9UJ7h',
  'AKfycbxT7hlri7NWPEHbsrCliUirnfywRX91iWmz9RdtrnfBd6owESLd8NvrMbwkNIV217hL',
  'AKfycbwLBPbYLGqNS9ad7mGrZV7uwOODGWAT8_NyYU4cduZsvvIL9xdQ4269PWe85hC26FVT',
  'AKfycbzrsRrAySwbWerj7qPqkzbI_FGug-4kJ0arzpEY4jD4KJvEUefznxfgI7LeenktCEp-',
  'AKfycbzISCRsDG1AX481duq2wm63un4ctDWJq3xbKKDYu84bgefUlsUeB55bdF3BQPgZCN82',
  'AKfycbzh3EDkYvHeRysiMPD8i1ug_sJiJeR51Pw_wPa4guP89FDqXK-4ElPzEbdy1GKhm02-',
  'AKfycbz7YNTg6z9jfeT8l4N1PQeygjYHSwPq9iW9vvDj93_O7rvjR0vLk7AiVrMtad9NUvZN',
  'AKfycbxnqmJ_5bqvmQpJxKi9jo1DCHhqjoS5CB3qf60yDshgKXMbVazRd__Kc_BUnOQE1R2y'
];

/**
 * Returns the currently active Google Apps Script Web App URL
 * Priority:
 * 1. User/Admin custom configured URL in localStorage
 * 2. Vercel / Vite Environment variable (VITE_GOOGLE_SHEETS_SCRIPT_URL)
 * 3. System Settings configured URL
 * 4. Default fallback URL
 */
export function getGoogleSheetsScriptUrl(): string {
  // 1. Check custom configured in localStorage
  try {
    const rawLocal = localStorage.getItem(GOOGLE_SHEETS_SCRIPT_KEY);
    if (rawLocal && rawLocal.trim().startsWith('http') && !OUTDATED_URL_KEYS.some(k => rawLocal.includes(k))) {
      return rawLocal.trim();
    }
  } catch {}

  // 2. Check Vercel / Vite Environment Variable
  try {
    const envUrl = (import.meta as any).env?.VITE_GOOGLE_SHEETS_SCRIPT_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
      return envUrl.trim();
    }
  } catch {}

  // 3. Check System Settings stored in app
  try {
    const settings = getSystemSettings();
    if (settings.googleSheetsScriptUrl?.trim().startsWith('http')) {
      const url = settings.googleSheetsScriptUrl.trim();
      if (!OUTDATED_URL_KEYS.some(k => url.includes(k))) {
        return url;
      }
    }
  } catch {}

  return DEFAULT_GOOGLE_APPS_SCRIPT_URL;
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
 * Check whether auto-backup to Google Sheets is enabled (defaults to true)
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
 * Check if the Google Sheets system is configured
 */
export function isGoogleSheetsConfigured(): boolean {
  return !!getGoogleSheetsScriptUrl();
}

/**
 * Core Network Dispatcher:
 * Executes an action against Google Apps Script with automatic proxy fallback.
 * Bypasses CORS and adblocker issues seamlessly.
 */
async function executeGoogleSheetsRequest(
  action: string,
  payload: Record<string, any> = {},
  customUrl?: string
): Promise<any> {
  const targetUrl = (customUrl || getGoogleSheetsScriptUrl()).trim();
  if (!targetUrl) {
    throw new Error('Google Sheets Web App URL is not configured.');
  }

  const isReadAction = [
    'ping',
    'getUser',
    'getAllUsers',
    'getAllSubscriptionCodes',
    'getSettings',
    'getBackupData',
    'getAll',
    'getAllSupportMessages'
  ].includes(action);

  // Method 1 (FOR READ ACTIONS): Direct GET request
  // Google Apps Script Web Apps handle GET with 302 redirects cleanly across all browsers without CORS issues
  if (isReadAction) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('action', action);
      if (payload.identifier) queryParams.set('identifier', String(payload.identifier));
      if (payload.id) queryParams.set('id', String(payload.id));
      if (payload.userId) queryParams.set('userId', String(payload.userId));
      queryParams.set('_t', String(Date.now()));

      const getUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}${queryParams.toString()}`;
      const getRes = await fetch(getUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (getRes.ok) {
        const data = await getRes.json();
        return data;
      }
    } catch (getErr) {
      console.warn('Direct GET read attempt note:', getErr);
    }
  }

  const fullPayload = {
    action,
    app: 'Zinovis Cloud Streaming Service',
    timestamp: Date.now(),
    ...payload
  };

  // Method 2: Server Proxy (/api/sheets-proxy) for Vercel and Express
  try {
    const proxyRes = await fetch('/api/sheets-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scriptUrl: targetUrl,
        payload: fullPayload
      })
    });

    if (proxyRes.ok) {
      return await proxyRes.json();
    }
  } catch (proxyErr) {
    // Continue to next method
  }

  // Method 3: Direct POST to Google Apps Script
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(fullPayload)
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (directErr) {
    // Continue to next method
  }

  // Method 4: GET Fallback for mutation actions
  try {
    const queryParams = new URLSearchParams();
    queryParams.set('action', action);
    if (payload.identifier) queryParams.set('identifier', String(payload.identifier));
    if (payload.id) queryParams.set('id', String(payload.id));
    if (payload.userId) queryParams.set('userId', String(payload.userId));
    if (payload.user) queryParams.set('user', JSON.stringify(payload.user));
    if (payload.code) queryParams.set('code', JSON.stringify(payload.code));
    if (payload.settings) queryParams.set('settings', JSON.stringify(payload.settings));
    queryParams.set('_t', String(Date.now()));

    const getUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}${queryParams.toString()}`;
    const getRes = await fetch(getUrl, {
      method: 'GET',
      redirect: 'follow'
    });

    if (getRes.ok) {
      const data = await getRes.json();
      return data;
    }
  } catch (getErr) {
    // Final error below
  }

  throw new Error('Could not connect to Google Sheets backend.');
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
    const data = await executeGoogleSheetsRequest('ping', {}, url);
    const latency = `${Date.now() - startTime}ms`;

    if (data && (data.status === 'ok' || data.success)) {
      return {
        connected: true,
        message: data.message || 'Successfully connected to Google Sheets Cloud Database!',
        latency,
        spreadsheetTitle: data.spreadsheetTitle || 'Zinovis Cloud Database',
        spreadsheetUrl: data.spreadsheetUrl,
        timestamp: data.timestamp || Date.now(),
        stats: {
          usersCount: data.usersCount,
          codesCount: data.codesCount
        }
      };
    }
    return {
      connected: false,
      message: data?.message || 'Unrecognized response from Google Sheets endpoint.',
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

// =========================================================================
// USER OPERATIONS (REAL-TIME CLOUD DATABASE)
// =========================================================================

/**
 * Fetch a user profile from Google Sheets by ID, username, or email
 */
export async function fetchUserFromGoogleSheets(identifier: string): Promise<User | null> {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;

  try {
    const res = await executeGoogleSheetsRequest('getUser', { identifier: clean });
    if (res && res.success && res.user) {
      return res.user as User;
    }
  } catch (err) {
    console.warn('fetchUserFromGoogleSheets note:', err);
  }
  return null;
}

/**
 * Fetch all users from Google Sheets Cloud Database
 */
export async function fetchAllUsersFromGoogleSheets(): Promise<User[]> {
  try {
    const res = await executeGoogleSheetsRequest('getAllUsers');
    if (res && res.success && Array.isArray(res.users)) {
      return res.users as User[];
    }
  } catch (err) {
    console.warn('fetchAllUsersFromGoogleSheets note:', err);
  }
  return [];
}

/**
 * Save or update a user profile in Google Sheets
 */
export async function saveUserToGoogleSheets(user: User): Promise<boolean> {
  try {
    const res = await executeGoogleSheetsRequest('upsertUser', { user });
    return !!(res && res.success);
  } catch (err) {
    console.warn('saveUserToGoogleSheets note:', err);
    return false;
  }
}

/**
 * Delete a user from Google Sheets
 */
export async function deleteUserFromGoogleSheets(userId: string): Promise<boolean> {
  try {
    const res = await executeGoogleSheetsRequest('deleteUser', { userId });
    return !!(res && res.success);
  } catch (err) {
    console.warn('deleteUserFromGoogleSheets note:', err);
    return false;
  }
}

/**
 * Synchronize user watch history to Google Sheets
 */
export async function syncWatchHistoryToGoogleSheets(userId: string, history: WatchHistoryItem[]): Promise<boolean> {
  try {
    const res = await executeGoogleSheetsRequest('syncWatchHistory', {
      userId,
      watchHistory: history
    });
    return !!(res && res.success);
  } catch (err) {
    console.warn('syncWatchHistoryToGoogleSheets note:', err);
    return false;
  }
}

/**
 * Synchronize user watchlist to Google Sheets
 */
export async function syncWatchLaterToGoogleSheets(userId: string, watchLater: WatchlistItem[]): Promise<boolean> {
  try {
    const res = await executeGoogleSheetsRequest('syncWatchLater', {
      userId,
      watchLater
    });
    return !!(res && res.success);
  } catch (err) {
    console.warn('syncWatchLaterToGoogleSheets note:', err);
    return false;
  }
}

// =========================================================================
// SUBSCRIPTION CODES OPERATIONS
// =========================================================================

/**
 * Fetch all subscription codes from Google Sheets
 */
export async function fetchAllCodesFromGoogleSheets(): Promise<SubscriptionCode[]> {
  try {
    const res = await executeGoogleSheetsRequest('getAllSubscriptionCodes');
    if (res && res.success && Array.isArray(res.codes)) {
      return res.codes as SubscriptionCode[];
    }
  } catch (err) {
    console.warn('fetchAllCodesFromGoogleSheets note:', err);
  }
  return [];
}

/**
 * Save or update a subscription code in Google Sheets
 */
export async function saveCodeToGoogleSheets(code: SubscriptionCode): Promise<boolean> {
  try {
    const res = await executeGoogleSheetsRequest('upsertSubscriptionCode', { code });
    return !!(res && res.success);
  } catch (err) {
    console.warn('saveCodeToGoogleSheets note:', err);
    return false;
  }
}

/**
 * Delete a subscription code from Google Sheets
 */
export async function deleteCodeFromGoogleSheets(codeId: string): Promise<boolean> {
  try {
    const res = await executeGoogleSheetsRequest('deleteSubscriptionCode', { codeId });
    return !!(res && res.success);
  } catch (err) {
    console.warn('deleteCodeFromGoogleSheets note:', err);
    return false;
  }
}

/**
 * Delete all subscription codes from Google Sheets
 */
export async function deleteAllCodesFromGoogleSheets(): Promise<boolean> {
  try {
    const res = await executeGoogleSheetsRequest('deleteAllSubscriptionCodes');
    return !!(res && res.success);
  } catch (err) {
    console.warn('deleteAllCodesFromGoogleSheets note:', err);
    return false;
  }
}

// =========================================================================
// SETTINGS & SUPPORT MESSAGES OPERATIONS
// =========================================================================

/**
 * Fetch system settings from Google Sheets
 */
export async function fetchSettingsFromGoogleSheets(): Promise<Partial<SystemSettings> | null> {
  try {
    const res = await executeGoogleSheetsRequest('getSettings');
    if (res && res.success && res.settings) {
      return res.settings as Partial<SystemSettings>;
    }
  } catch (err) {
    console.warn('fetchSettingsFromGoogleSheets note:', err);
  }
  return null;
}

/**
 * Save system settings to Google Sheets
 */
export async function saveSettingsToGoogleSheets(settings: Partial<SystemSettings>): Promise<boolean> {
  try {
    const res = await executeGoogleSheetsRequest('upsertSettings', { settings });
    return !!(res && res.success);
  } catch (err) {
    console.warn('saveSettingsToGoogleSheets note:', err);
    return false;
  }
}

/**
 * Fetch support messages from Google Sheets
 */
export async function fetchSupportMessagesFromGoogleSheets(): Promise<SupportMessage[]> {
  try {
    const res = await executeGoogleSheetsRequest('getAllSupportMessages');
    if (res && res.success && Array.isArray(res.messages)) {
      return res.messages as SupportMessage[];
    }
  } catch (err) {
    console.warn('fetchSupportMessagesFromGoogleSheets note:', err);
  }
  return [];
}

/**
 * Send a support message to Google Sheets
 */
export async function sendSupportMessageToGoogleSheets(msg: SupportMessage): Promise<boolean> {
  try {
    const res = await executeGoogleSheetsRequest('upsertSupportMessage', { message: msg });
    return !!(res && res.success);
  } catch (err) {
    console.warn('sendSupportMessageToGoogleSheets note:', err);
    return false;
  }
}

/**
 * Delete all support messages for a user
 */
export async function deleteSupportThreadFromGoogleSheets(userId: string): Promise<boolean> {
  try {
    const res = await executeGoogleSheetsRequest('deleteSupportThread', { userId });
    return !!(res && res.success);
  } catch (err) {
    console.warn('deleteSupportThreadFromGoogleSheets note:', err);
    return false;
  }
}

// =========================================================================
// FULL BACKUP & RESTORE OPERATIONS (BULK)
// =========================================================================

/**
 * Push full snapshot of database to Google Sheets
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
  const users = customData?.users || getAllUsers();
  const codes = customData?.codes || getSubscriptionCodes();
  const settings = customData?.settings || getSystemSettings();
  const supportMessages = customData?.supportMessages || [];

  try {
    const res = await executeGoogleSheetsRequest(
      'backupAll',
      {
        data: {
          users,
          subscriptionCodes: codes,
          settings,
          supportMessages
        }
      },
      scriptUrl
    );

    return {
      success: true,
      message: res.message || `Successfully synced ${users.length} user(s) and ${codes.length} VIP code(s) to Google Sheets!`,
      stats: res.stats || { usersCount: users.length, codesCount: codes.length }
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to push backup to Google Sheets: ${err?.message || 'Network error'}`,
      error: err?.message
    };
  }
}

/**
 * Fetch complete backup snapshot from Google Sheets
 */
export async function fetchBackupFromGoogleSheets(
  scriptUrl?: string
): Promise<{ success: boolean; data?: GoogleSheetsRestoreData; message: string; error?: string }> {
  try {
    const res = await executeGoogleSheetsRequest('getBackupData', {}, scriptUrl);
    if (res && res.success && res.data) {
      return {
        success: true,
        data: res.data,
        message: `Retrieved ${res.data.users?.length || 0} user(s) and ${res.data.subscriptionCodes?.length || 0} code(s) from Google Sheets!`
      };
    }
    return {
      success: false,
      message: res?.message || 'No valid data returned from Google Sheets.',
      error: 'Invalid response'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to retrieve backup from Google Sheets: ${err?.message || 'Check Script deployment'}`,
      error: err?.message
    };
  }
}

// Background dispatchers for backward compatibility
export function dispatchUserToGoogleSheets(user: User): void {
  saveUserToGoogleSheets(user).catch(() => {});
}

export function dispatchSubscriptionCodeToGoogleSheets(code: SubscriptionCode): void {
  saveCodeToGoogleSheets(code).catch(() => {});
}

export function dispatchSupportMessageToGoogleSheets(msg: SupportMessage | (Omit<SupportMessage, 'id'> & { id?: string })): void {
  sendSupportMessageToGoogleSheets(msg as SupportMessage).catch(() => {});
}

export function dispatchSettingsToGoogleSheets(settings: Partial<SystemSettings>): void {
  saveSettingsToGoogleSheets(settings).catch(() => {});
}

/**
 * Copy-paste ready Google Apps Script code for the Admin Panel
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * ZINOVIS STREAMING ENGINE - GOOGLE SHEETS CLOUD DATA SERVER
 * =========================================================================
 * 
 * Works as the primary, persistent cloud data server for Zinovis across
 * all devices, browsers, and platforms (including Vercel deployment).
 * 
 * INSTRUCTIONS TO DEPLOY:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Rename Spreadsheet to "Zinovis Cloud Database"
 * 3. In the top menu, click: Extensions > Apps Script
 * 4. Paste THIS entire code into Code.gs
 * 5. Click "Deploy" > "New deployment"
 * 6. Under "Select type", choose "Web app"
 * 7. Set:
 *    - Description: "Zinovis Cloud Data Server"
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone" (REQUIRED so all devices can connect)
 * 8. Click "Deploy", authorize permissions, and COPY the Web App URL.
 * 9. Paste into Zinovis Admin Panel > Google Sheets, or set VITE_GOOGLE_SHEETS_SCRIPT_URL in Vercel.
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
      try { params = JSON.parse(e.postData.contents); } catch (err) { params = {}; }
    } else if (e && e.parameter) {
      params = e.parameter;
    }

    var action = params.action || (e && e.parameter && e.parameter.action) || 'ping';

    // 1. HEALTH PING
    if (action === 'ping') {
      var uSheet = ss.getSheetByName('Users');
      var cSheet = ss.getSheetByName('Subscription_Codes');
      var userCount = uSheet && uSheet.getLastRow() > 1 ? uSheet.getLastRow() - 1 : 0;
      var codeCount = cSheet && cSheet.getLastRow() > 1 ? cSheet.getLastRow() - 1 : 0;

      output = {
        success: true,
        status: 'ok',
        message: 'Zinovis Google Sheets Cloud Data Server is online and operational!',
        spreadsheetTitle: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        usersCount: userCount,
        codesCount: codeCount,
        timestamp: new Date().getTime()
      };
    }

    // 2. GET USER
    else if (action === 'getUser') {
      var query = String(params.identifier || params.id || params.email || params.username || '').trim().toLowerCase();
      var foundUser = null;
      var uSheet = getOrCreateUsersSheet(ss);
      var lastRow = uSheet.getLastRow();
      var lastCol = Math.max(uSheet.getLastColumn(), 16);

      if (lastRow > 1 && query) {
        var headerMap = createHeaderMap(uSheet);
        var data = uSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
        for (var i = 0; i < data.length; i++) {
          var userObj = parseUserRow(data[i], headerMap, i);
          var uId = String(userObj.id || '').trim().toLowerCase();
          var uUsername = String(userObj.username || '').trim().toLowerCase();
          var uEmail = String(userObj.email || '').trim().toLowerCase();

          if (uId === query || uUsername === query || uEmail === query) {
            foundUser = userObj;
            break;
          }
        }
      }

      if (foundUser) {
        output = { success: true, user: foundUser };
      } else {
        output = { success: false, message: 'User not found in Google Sheets' };
      }
    }

    // 3. GET ALL USERS
    else if (action === 'getAllUsers') {
      var users = [];
      var uSheet = getOrCreateUsersSheet(ss);
      var lastRow = uSheet.getLastRow();
      var lastCol = Math.max(uSheet.getLastColumn(), 16);

      if (lastRow > 1) {
        var headerMap = createHeaderMap(uSheet);
        var data = uSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
        for (var i = 0; i < data.length; i++) {
          var userObj = parseUserRow(data[i], headerMap, i);
          if (userObj && (userObj.id || userObj.username || userObj.email || userObj.name)) {
            users.push(userObj);
          }
        }
      }

      output = { success: true, users: users, count: users.length };
    }

    // 4. UPSERT USER
    else if (action === 'upsertUser' && params.user) {
      var u = params.user;
      var uSheet = getOrCreateUsersSheet(ss);
      var lastRow = uSheet.getLastRow();
      var targetRow = -1;

      var cleanId = String(u.id || '').trim().toLowerCase();
      var cleanEmail = String(u.email || '').trim().toLowerCase();
      var cleanUsername = String(u.username || '').trim().toLowerCase();

      if (lastRow > 1) {
        var existingData = uSheet.getRange(2, 1, lastRow - 1, 4).getValues();
        for (var i = 0; i < existingData.length; i++) {
          var eId = String(existingData[i][0] || '').trim().toLowerCase();
          var eUsername = String(existingData[i][1] || '').trim().toLowerCase();
          var eEmail = String(existingData[i][3] || '').trim().toLowerCase();

          if ((cleanId && eId === cleanId) || (cleanEmail && eEmail === cleanEmail) || (cleanUsername && eUsername === cleanUsername)) {
            targetRow = i + 2;
            break;
          }
        }
      }

      var watchHistoryJson = '';
      if (u.watchHistory && Array.isArray(u.watchHistory)) {
        try { watchHistoryJson = JSON.stringify(u.watchHistory); } catch (e) {}
      } else if (typeof u.watchHistory === 'string') {
        watchHistoryJson = u.watchHistory;
      }

      var watchLaterJson = '';
      if (u.watchLater && Array.isArray(u.watchLater)) {
        try { watchLaterJson = JSON.stringify(u.watchLater); } catch (e) {}
      } else if (typeof u.watchLater === 'string') {
        watchLaterJson = u.watchLater;
      }

      var subTier = 'Free Tier';
      var subExpires = 'None';
      var isPerm = 'No';

      if (u.subscription) {
        subTier = u.subscription.tier || 'Free Tier';
        if (u.subscription.isPermanent || subTier === 'permanent') {
          subExpires = 'Permanent VIP';
          isPerm = 'Yes';
        } else if (u.subscription.expiresAt) {
          subExpires = new Date(u.subscription.expiresAt).toISOString();
        }
      }

      var joinedStr = u.joinedAt ? new Date(u.joinedAt).toISOString() : new Date().toISOString();

      var userRowData = [
        String(u.id || ('u_' + Date.now())),
        String(u.username || ''),
        String(u.name || ''),
        String(u.email || ''),
        String(u.password || ''),
        String(u.avatar || ''),
        String(u.country || 'Global'),
        u.age !== undefined && u.age !== null ? u.age : '',
        u.isUnder18 ? 'Yes' : 'No',
        joinedStr,
        subTier,
        subExpires,
        isPerm,
        watchHistoryJson,
        watchLaterJson,
        new Date().toISOString()
      ];

      if (targetRow > 1) {
        uSheet.getRange(targetRow, 1, 1, userRowData.length).setValues([userRowData]);
      } else {
        uSheet.appendRow(userRowData);
      }

      output = { success: true, message: 'User synchronized to Google Sheets' };
    }

    // 5. DELETE USER
    else if (action === 'deleteUser' && params.userId) {
      var delId = String(params.userId).trim().toLowerCase();
      var uSheet = getOrCreateUsersSheet(ss);
      var lastRow = uSheet.getLastRow();
      var deleted = false;

      if (lastRow > 1) {
        var idCol = uSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < idCol.length; i++) {
          if (String(idCol[i][0]).trim().toLowerCase() === delId) {
            uSheet.deleteRow(i + 2);
            deleted = true;
            break;
          }
        }
      }

      output = { success: deleted, message: deleted ? 'User deleted' : 'User ID not found' };
    }

    // 6. SYNC WATCH HISTORY
    else if (action === 'syncWatchHistory' && params.userId) {
      var syncUserId = String(params.userId).trim().toLowerCase();
      var historyPayload = typeof params.watchHistory === 'string' ? params.watchHistory : JSON.stringify(params.watchHistory || []);
      var uSheet = getOrCreateUsersSheet(ss);
      var lastRow = uSheet.getLastRow();
      var updated = false;

      if (lastRow > 1) {
        var idCol = uSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < idCol.length; i++) {
          if (String(idCol[i][0]).trim().toLowerCase() === syncUserId) {
            uSheet.getRange(i + 2, 14).setValue(historyPayload);
            uSheet.getRange(i + 2, 16).setValue(new Date().toISOString());
            updated = true;
            break;
          }
        }
      }

      output = { success: updated, message: updated ? 'History synced' : 'User not found' };
    }

    // 7. SYNC WATCHLIST
    else if (action === 'syncWatchLater' && params.userId) {
      var syncUserId = String(params.userId).trim().toLowerCase();
      var watchlistPayload = typeof params.watchLater === 'string' ? params.watchLater : JSON.stringify(params.watchLater || []);
      var uSheet = getOrCreateUsersSheet(ss);
      var lastRow = uSheet.getLastRow();
      var updated = false;

      if (lastRow > 1) {
        var idCol = uSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < idCol.length; i++) {
          if (String(idCol[i][0]).trim().toLowerCase() === syncUserId) {
            uSheet.getRange(i + 2, 15).setValue(watchlistPayload);
            uSheet.getRange(i + 2, 16).setValue(new Date().toISOString());
            updated = true;
            break;
          }
        }
      }

      output = { success: updated, message: updated ? 'Watchlist synced' : 'User not found' };
    }

    // 8. GET ALL CODES
    else if (action === 'getAllSubscriptionCodes') {
      var codes = [];
      var cSheet = getOrCreateCodesSheet(ss);
      var lastRow = cSheet.getLastRow();

      if (lastRow > 1) {
        var data = cSheet.getRange(2, 1, lastRow - 1, 10).getValues();
        for (var i = 0; i < data.length; i++) {
          var codeObj = parseCodeRow(data[i], i);
          if (codeObj.code) codes.push(codeObj);
        }
      }

      output = { success: true, codes: codes, count: codes.length };
    }

    // 9. UPSERT CODE
    else if (action === 'upsertSubscriptionCode' && params.code) {
      var c = params.code;
      var cSheet = getOrCreateCodesSheet(ss);
      var lastRow = cSheet.getLastRow();
      var foundRow = -1;

      var cleanCodeId = String(c.id || '').trim();
      var cleanCodeStr = String(c.code || '').trim().toUpperCase();

      if (lastRow > 1) {
        var existing = cSheet.getRange(2, 1, lastRow - 1, 2).getValues();
        for (var j = 0; j < existing.length; j++) {
          if (String(existing[j][0]).trim() === cleanCodeId || String(existing[j][1]).trim().toUpperCase() === cleanCodeStr) {
            foundRow = j + 2;
            break;
          }
        }
      }

      var redeemedByStr = '';
      if (c.redeemedBy) {
        redeemedByStr = typeof c.redeemedBy === 'string' ? c.redeemedBy : (c.redeemedBy.userName || c.redeemedBy.userEmail || c.redeemedBy.userId || '');
      }

      var redeemedDateStr = c.redeemedAt ? new Date(c.redeemedAt).toISOString() : '';
      var createdDateStr = c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString();

      var codeRow = [
        cleanCodeId,
        cleanCodeStr,
        c.tier || 'one_month',
        c.durationDays || 0,
        c.isRedeemed ? 'Redeemed' : 'Active',
        redeemedByStr,
        redeemedDateStr,
        createdDateStr,
        c.note || '',
        new Date().toISOString()
      ];

      if (foundRow > 1) {
        cSheet.getRange(foundRow, 1, 1, codeRow.length).setValues([codeRow]);
      } else {
        cSheet.appendRow(codeRow);
      }

      output = { success: true, message: 'Code saved in Google Sheets' };
    }

    // 10. DELETE CODE
    else if (action === 'deleteSubscriptionCode' && params.codeId) {
      var codeId = String(params.codeId).trim();
      var cSheet = getOrCreateCodesSheet(ss);
      var lastRow = cSheet.getLastRow();
      var deleted = false;

      if (lastRow > 1) {
        var idCol = cSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < idCol.length; i++) {
          if (String(idCol[i][0]).trim() === codeId) {
            cSheet.deleteRow(i + 2);
            deleted = true;
            break;
          }
        }
      }

      output = { success: deleted, message: deleted ? 'Code deleted' : 'Code not found' };
    }

    // 11. DELETE ALL CODES
    else if (action === 'deleteAllSubscriptionCodes') {
      var cSheet = getOrCreateCodesSheet(ss);
      clearSheetPreserveHeaders(cSheet);
      output = { success: true, message: 'All codes wiped from Google Sheets' };
    }

    // 12. GET SETTINGS
    else if (action === 'getSettings') {
      var sSheet = getOrCreateSettingsSheet(ss);
      var settings = { subscriptionRequired: false, shopUrl: '', updatedAt: Date.now() };

      var lastRow = sSheet.getLastRow();
      if (lastRow > 1) {
        var rows = sSheet.getRange(2, 1, lastRow - 1, 2).getValues();
        for (var i = 0; i < rows.length; i++) {
          var key = String(rows[i][0] || '').trim();
          var val = rows[i][1];
          if (key === 'Subscription Gate Required') {
            settings.subscriptionRequired = (val === 'Yes' || val === true || val === 'true');
          } else if (key === 'VIP Store Shop URL') {
            settings.shopUrl = String(val || '');
          }
        }
      }

      output = { success: true, settings: settings };
    }

    // 13. UPSERT SETTINGS
    else if (action === 'upsertSettings' && params.settings) {
      var sSheet = getOrCreateSettingsSheet(ss);
      clearSheetPreserveHeaders(sSheet);

      var newRows = [
        ['Subscription Gate Required', params.settings.subscriptionRequired ? 'Yes' : 'No', new Date().toISOString()],
        ['VIP Store Shop URL', params.settings.shopUrl || '', new Date().toISOString()],
        ['Last Engine Sync', new Date().toISOString(), new Date().toISOString()]
      ];
      sSheet.getRange(2, 1, newRows.length, 3).setValues(newRows);
      output = { success: true, message: 'Settings saved to Google Sheets' };
    }

    // 14. GET SUPPORT TICKETS
    else if (action === 'getAllSupportMessages') {
      var msgs = [];
      var supSheet = getOrCreateSupportSheet(ss);
      var lastRow = supSheet.getLastRow();

      if (lastRow > 1) {
        var data = supSheet.getRange(2, 1, lastRow - 1, 8).getValues();
        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          if (row[0] || row[5]) {
            msgs.push({
              id: String(row[0] || ('msg_' + i)),
              userId: String(row[1] || ''),
              userName: String(row[2] || ''),
              userEmail: String(row[3] || ''),
              sender: row[4] === 'admin' ? 'admin' : 'user',
              message: String(row[5] || ''),
              read: row[6] === 'Yes' || row[6] === true,
              createdAt: row[7] ? new Date(row[7]).getTime() : Date.now()
            });
          }
        }
      }

      output = { success: true, messages: msgs };
    }

    // 15. UPSERT SUPPORT MESSAGE
    else if (action === 'upsertSupportMessage' && params.message) {
      var m = params.message;
      var supSheet = getOrCreateSupportSheet(ss);
      var row = [
        m.id || ('msg_' + Date.now()),
        m.userId || '',
        m.userName || '',
        m.userEmail || '',
        m.sender || 'user',
        m.message || '',
        m.read ? 'Yes' : 'No',
        m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString()
      ];
      supSheet.appendRow(row);
      output = { success: true, message: 'Support message logged to Google Sheets' };
    }

    // 16. DELETE SUPPORT THREAD FOR USER
    else if (action === 'deleteSupportThread' && params.userId) {
      var supUserId = String(params.userId).trim();
      var supSheet = getOrCreateSupportSheet(ss);
      var lastRow = supSheet.getLastRow();

      if (lastRow > 1) {
        for (var i = lastRow; i >= 2; i--) {
          var rowUserId = String(supSheet.getRange(i, 2).getValue()).trim();
          if (rowUserId === supUserId) {
            supSheet.deleteRow(i);
          }
        }
      }

      output = { success: true, message: 'Support messages cleared for user' };
    }

    // 17. GET COMPLETE DATABASE
    else if (action === 'getBackupData' || action === 'getAll') {
      var restoredUsers = [];
      var restoredCodes = [];
      var restoredSettings = { subscriptionRequired: false, shopUrl: '' };
      var restoredMsgs = [];

      var uSheet = getOrCreateUsersSheet(ss);
      if (uSheet.getLastRow() > 1) {
        var uRows = uSheet.getRange(2, 1, uSheet.getLastRow() - 1, 16).getValues();
        for (var i = 0; i < uRows.length; i++) {
          var userObj = parseUserRow(uRows[i]);
          if (userObj.id) restoredUsers.push(userObj);
        }
      }

      var cSheet = getOrCreateCodesSheet(ss);
      if (cSheet.getLastRow() > 1) {
        var cRows = cSheet.getRange(2, 1, cSheet.getLastRow() - 1, 10).getValues();
        for (var j = 0; j < cRows.length; j++) {
          var codeObj = parseCodeRow(cRows[j], j);
          if (codeObj.code) restoredCodes.push(codeObj);
        }
      }

      var sSheet = getOrCreateSettingsSheet(ss);
      if (sSheet.getLastRow() > 1) {
        var sRows = sSheet.getRange(2, 1, sSheet.getLastRow() - 1, 2).getValues();
        for (var k = 0; k < sRows.length; k++) {
          var key = String(sRows[k][0] || '').trim();
          var val = sRows[k][1];
          if (key === 'Subscription Gate Required') {
            restoredSettings.subscriptionRequired = (val === 'Yes' || val === true || val === 'true');
          } else if (key === 'VIP Store Shop URL') {
            restoredSettings.shopUrl = String(val || '');
          }
        }
      }

      var supSheet = getOrCreateSupportSheet(ss);
      if (supSheet.getLastRow() > 1) {
        var supRows = supSheet.getRange(2, 1, supSheet.getLastRow() - 1, 8).getValues();
        for (var l = 0; l < supRows.length; l++) {
          var r = supRows[l];
          if (r[0] || r[5]) {
            restoredMsgs.push({
              id: String(r[0] || ('msg_' + l)),
              userId: String(r[1] || ''),
              userName: String(r[2] || ''),
              userEmail: String(r[3] || ''),
              sender: r[4] === 'admin' ? 'admin' : 'user',
              message: String(r[5] || ''),
              read: r[6] === 'Yes' || r[6] === true,
              createdAt: r[7] ? new Date(r[7]).getTime() : Date.now()
            });
          }
        }
      }

      output = {
        success: true,
        status: 'ok',
        data: {
          users: restoredUsers,
          subscriptionCodes: restoredCodes,
          settings: restoredSettings,
          supportMessages: restoredMsgs
        },
        spreadsheetUrl: ss.getUrl(),
        timestamp: Date.now()
      };
    }

    // 18. FULL BACKUP
    else if (action === 'backupAll') {
      var data = params.data || {};
      var stats = { usersCount: 0, codesCount: 0, settingsUpdated: false, messagesCount: 0 };

      if (data.users && Array.isArray(data.users)) {
        var uSheet = getOrCreateUsersSheet(ss);
        clearSheetPreserveHeaders(uSheet);

        var userRows = data.users.map(function(u) {
          var wHistory = '';
          if (u.watchHistory && Array.isArray(u.watchHistory)) {
            try { wHistory = JSON.stringify(u.watchHistory); } catch(e) {}
          } else if (typeof u.watchHistory === 'string') {
            wHistory = u.watchHistory;
          }

          var wLater = '';
          if (u.watchLater && Array.isArray(u.watchLater)) {
            try { wLater = JSON.stringify(u.watchLater); } catch(e) {}
          } else if (typeof u.watchLater === 'string') {
            wLater = u.watchLater;
          }

          var sTier = 'Free Tier';
          var sExp = 'None';
          var isP = 'No';

          if (u.subscription) {
            sTier = u.subscription.tier || 'Free Tier';
            if (u.subscription.isPermanent || sTier === 'permanent') {
              sExp = 'Permanent VIP';
              isP = 'Yes';
            } else if (u.subscription.expiresAt) {
              sExp = new Date(u.subscription.expiresAt).toISOString();
            }
          }

          return [
            String(u.id || ('u_' + Date.now())),
            String(u.username || ''),
            String(u.name || ''),
            String(u.email || ''),
            String(u.password || ''),
            String(u.avatar || ''),
            String(u.country || 'Global'),
            u.age !== undefined && u.age !== null ? u.age : '',
            u.isUnder18 ? 'Yes' : 'No',
            u.joinedAt ? new Date(u.joinedAt).toISOString() : new Date().toISOString(),
            sTier,
            sExp,
            isP,
            wHistory,
            wLater,
            new Date().toISOString()
          ];
        });

        if (userRows.length > 0) {
          uSheet.getRange(2, 1, userRows.length, userRows[0].length).setValues(userRows);
          stats.usersCount = userRows.length;
        }
      }

      if (data.subscriptionCodes && Array.isArray(data.subscriptionCodes)) {
        var cSheet = getOrCreateCodesSheet(ss);
        clearSheetPreserveHeaders(cSheet);

        var codeRows = data.subscriptionCodes.map(function(c) {
          var rBy = '';
          if (c.redeemedBy) {
            rBy = typeof c.redeemedBy === 'string' ? c.redeemedBy : (c.redeemedBy.userName || c.redeemedBy.userEmail || c.redeemedBy.userId || '');
          }
          return [
            String(c.id || ''),
            String(c.code || '').toUpperCase(),
            c.tier || 'one_month',
            c.durationDays || 0,
            c.isRedeemed ? 'Redeemed' : 'Active',
            rBy,
            c.redeemedAt ? new Date(c.redeemedAt).toISOString() : '',
            c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
            c.note || '',
            new Date().toISOString()
          ];
        });

        if (codeRows.length > 0) {
          cSheet.getRange(2, 1, codeRows.length, codeRows[0].length).setValues(codeRows);
          stats.codesCount = codeRows.length;
        }
      }

      if (data.settings) {
        var sSheet = getOrCreateSettingsSheet(ss);
        clearSheetPreserveHeaders(sSheet);

        var sRows = [
          ['Subscription Gate Required', data.settings.subscriptionRequired ? 'Yes' : 'No', new Date().toISOString()],
          ['VIP Store Shop URL', data.settings.shopUrl || '', new Date().toISOString()],
          ['Last Engine Sync', new Date().toISOString(), new Date().toISOString()]
        ];
        sSheet.getRange(2, 1, sRows.length, 3).setValues(sRows);
        stats.settingsUpdated = true;
      }

      output = {
        success: true,
        status: 'ok',
        message: 'Snapshot backed up to Google Sheets Cloud Database!',
        stats: stats,
        spreadsheetUrl: ss.getUrl()
      };
    }

    else {
      output = { success: false, message: 'Unrecognized action: ' + action };
    }

  } catch (error) {
    output = {
      success: false,
      status: 'error',
      message: error.toString()
    };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function createHeaderMap(sheet) {
  var map = {};
  if (!sheet || sheet.getLastRow() < 1) return map;
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return map;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').trim().toLowerCase().replace(/[\s_\-]+/g, '');
    if (h) {
      map[h] = i;
    }
  }
  return map;
}

function getColVal(row, headerMap, possibleKeys, defaultIndex) {
  if (headerMap && Object.keys(headerMap).length > 0) {
    for (var k = 0; k < possibleKeys.length; k++) {
      var cleanKey = possibleKeys[k].toLowerCase().replace(/[\s_\-]+/g, '');
      if (headerMap[cleanKey] !== undefined) {
        var idx = headerMap[cleanKey];
        if (idx < row.length && row[idx] !== undefined && row[idx] !== null) {
          return row[idx];
        }
      }
    }
    return '';
  }
  if (defaultIndex !== undefined && defaultIndex < row.length) {
    return row[defaultIndex];
  }
  return '';
}

function parseUserRow(row, headerMap, idx) {
  var rawHistory = getColVal(row, headerMap, ['watchhistoryjson', 'watchhistory', 'history'], 13);
  var parsedHistory = [];
  if (rawHistory) {
    try {
      parsedHistory = typeof rawHistory === 'string' ? JSON.parse(rawHistory) : rawHistory;
      if (!Array.isArray(parsedHistory)) parsedHistory = [];
    } catch(e) { parsedHistory = []; }
  }

  var rawWatchlist = getColVal(row, headerMap, ['watchlaterjson', 'watchlist', 'watchlater'], 14);
  var parsedWatchlist = [];
  if (rawWatchlist) {
    try {
      parsedWatchlist = typeof rawWatchlist === 'string' ? JSON.parse(rawWatchlist) : rawWatchlist;
      if (!Array.isArray(parsedWatchlist)) parsedWatchlist = [];
    } catch(e) { parsedWatchlist = []; }
  }

  var tierStr = String(getColVal(row, headerMap, ['subscriptiontier', 'tier', 'plan', 'vip'], 10) || 'Free Tier');
  var expStr = String(getColVal(row, headerMap, ['vipexpiration', 'expiration', 'expiresat'], 11) || 'None');
  var isPerm = String(getColVal(row, headerMap, ['ispermanentvip', 'permanent', 'ispermanent'], 12)).toLowerCase() === 'yes' || expStr === 'Permanent VIP' || tierStr === 'permanent';

  var subscription = undefined;
  if (tierStr && tierStr !== 'Free Tier' && tierStr !== 'None') {
    subscription = {
      tier: tierStr,
      startDate: Date.now(),
      expiresAt: isPerm ? undefined : (expStr && expStr !== 'None' ? new Date(expStr).getTime() : undefined),
      isPermanent: isPerm
    };
  }

  var id = String(getColVal(row, headerMap, ['userid', 'id', 'user_id', 'uuid'], 0) || '').trim();
  var username = String(getColVal(row, headerMap, ['username', 'user', 'handle'], 1) || '').trim();
  var name = String(getColVal(row, headerMap, ['fullname', 'name', 'displayname'], 2) || '').trim();
  var email = String(getColVal(row, headerMap, ['email', 'mail', 'emailaddress'], 3) || '').trim();
  var password = String(getColVal(row, headerMap, ['password', 'pass', 'pwd'], 4) || '').trim();
  var avatar = String(getColVal(row, headerMap, ['avatar', 'picture', 'photo', 'image', 'icon'], 5) || '').trim();
  var country = String(getColVal(row, headerMap, ['country', 'location', 'region', 'nation'], 6) || 'Global').trim();
  var rawAge = getColVal(row, headerMap, ['age'], 7);
  var age = rawAge !== '' && !isNaN(Number(rawAge)) ? Number(rawAge) : undefined;
  var isUnder18 = String(getColVal(row, headerMap, ['under18', 'minor', 'isunder18'], 8)).toLowerCase() === 'yes';
  var joinedRaw = getColVal(row, headerMap, ['joineddate', 'joinedat', 'createdat', 'date'], 9);
  var joinedAt = joinedRaw ? new Date(joinedRaw).getTime() : Date.now();

  // If ID is missing, auto-create a persistent ID so the user is not dropped
  if (!id) {
    id = username ? ('u_' + username) : (email ? ('u_' + email.replace(/[^a-zA-Z0-9]/g, '_')) : ('u_' + ((idx || 0) + 1)));
  }

  return {
    id: id,
    username: username || id,
    name: name || username || 'User',
    email: email,
    password: password,
    avatar: avatar,
    country: country,
    age: age,
    isUnder18: isUnder18,
    joinedAt: joinedAt,
    subscription: subscription,
    watchHistory: parsedHistory,
    watchLater: parsedWatchlist
  };
}

function parseCodeRow(row, headerMap, idx) {
  var isRedeemed = String(getColVal(row, headerMap, ['status', 'isredeemed', 'state'], 4)).toLowerCase() === 'redeemed' || getColVal(row, headerMap, ['status', 'isredeemed'], 4) === true;
  var redeemedByRaw = getColVal(row, headerMap, ['redeemedby', 'user', 'redeemeduser'], 5);
  var redeemedBy = undefined;
  if (redeemedByRaw) {
    redeemedBy = { userName: String(redeemedByRaw), userEmail: '' };
  }

  var rawDays = getColVal(row, headerMap, ['durationdays', 'duration', 'days'], 3);
  var code = String(getColVal(row, headerMap, ['passcodekey', 'code', 'passcode', 'key'], 1) || '').toUpperCase();
  var id = String(getColVal(row, headerMap, ['codeid', 'id'], 0) || ('code_' + (idx || 0)));

  return {
    id: id,
    code: code,
    tier: String(getColVal(row, headerMap, ['tier', 'plan'], 2) || 'one_month'),
    durationDays: !isNaN(Number(rawDays)) ? Number(rawDays) : 30,
    isRedeemed: isRedeemed,
    redeemedBy: redeemedBy,
    redeemedAt: undefined,
    createdAt: Date.now(),
    note: String(getColVal(row, headerMap, ['notes', 'note'], 8) || '')
  };
}

function getOrCreateUsersSheet(ss) {
  var headers = [
    'User ID', 'Username', 'Full Name', 'Email', 'Password', 'Avatar', 
    'Country', 'Age', 'Under 18', 'Joined Date', 'Subscription Tier', 
    'VIP Expiration', 'Is Permanent VIP', 'Watch History JSON', 'Watch Later JSON', 'Last Synced'
  ];

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().trim().toLowerCase();
    if (name === 'users' || name === 'user' || name === 'accounts' || name === 'members') {
      return sheets[i];
    }
  }

  if (sheets.length === 1 && (sheets[0].getName() === 'Sheet1' || sheets[0].getName() === '工作表1') && sheets[0].getLastRow() > 1) {
    return sheets[0];
  }

  return getOrCreateSheetWithHeaders(ss, 'Users', headers, '#1e293b');
}

function getOrCreateCodesSheet(ss) {
  var headers = [
    'Code ID', 'Passcode Key', 'Tier', 'Duration (Days)', 
    'Status', 'Redeemed By', 'Redeemed Date', 'Created Date', 'Notes', 'Last Synced'
  ];

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().trim().toLowerCase();
    if (name === 'subscription_codes' || name === 'codes' || name === 'passcodes' || name === 'vip_codes') {
      return sheets[i];
    }
  }

  return getOrCreateSheetWithHeaders(ss, 'Subscription_Codes', headers, '#831843');
}

function getOrCreateSettingsSheet(ss) {
  var headers = ['Setting Key', 'Value', 'Last Updated'];
  return getOrCreateSheetWithHeaders(ss, 'Settings', headers, '#065f46');
}

function getOrCreateSupportSheet(ss) {
  var headers = ['Message ID', 'User ID', 'User Name', 'Email', 'Sender', 'Message Text', 'Read Status', 'Created Date'];
  return getOrCreateSheetWithHeaders(ss, 'Support_Tickets', headers, '#312e81');
}

function getOrCreateSheetWithHeaders(ss, sheetName, headers, headerColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length, headerColor);
  } else {
    var lastCol = sheet.getLastColumn();
    if (lastCol < headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatHeaderRow(sheet, headers.length, headerColor);
    }
  }
  return sheet;
}

function formatHeaderRow(sheet, colCount, hexColor) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground(hexColor || '#1e293b');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function clearSheetPreserveHeaders(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
}
`;
