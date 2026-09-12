/**
 * =========================================================================
 * ZINOVIS STREAMING ENGINE - GOOGLE SHEETS CLOUD DATA SERVER
 * =========================================================================
 * 
 * Works as the primary, persistent cloud data server for Zinovis across
 * all devices, browsers, and platforms (including Vercel deployment).
 * 
 * INSTRUCTIONS TO DEPLOY (Takes ~30 seconds):
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Rename the Spreadsheet to "Zinovis Cloud Database"
 * 3. In the top menu, click: Extensions > Apps Script
 * 4. Delete any code in Code.gs and paste THIS entire file.
 * 5. Click "Deploy" > "New deployment"
 * 6. Under "Select type" (gear icon), choose "Web app"
 * 7. Set:
 *    - Description: "Zinovis Cloud Data Server"
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone" (REQUIRED so all devices can connect)
 * 8. Click "Deploy", authorize permissions, and COPY the Web App URL.
 * 9. In Zinovis Admin Panel > Google Sheets, paste the URL.
 *    OR set VITE_GOOGLE_SHEETS_SCRIPT_URL in your Vercel Environment Variables.
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

    // 2. GET USER (BY ID, USERNAME, OR EMAIL)
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

    // 4. UPSERT USER (INSERT OR UPDATE FULL PROFILE)
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

      // Serialize watch history & watchlist safely
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

      logActivity(ss, 'User Upsert', 'User: ' + (u.name || u.username || u.id));
      output = { success: true, message: 'User synchronized to Google Sheets Cloud Database' };
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

    // 6. SYNC WATCH HISTORY ONLY (HIGH-PERFORMANCE)
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

    // 7. SYNC WATCHLIST / WATCH LATER ONLY (HIGH-PERFORMANCE)
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

    // 8. GET ALL SUBSCRIPTION CODES
    else if (action === 'getAllSubscriptionCodes') {
      var codes = [];
      var cSheet = getOrCreateCodesSheet(ss);
      var lastRow = cSheet.getLastRow();

      if (lastRow > 1) {
        var data = cSheet.getRange(2, 1, lastRow - 1, 10).getValues();
        for (var i = 0; i < data.length; i++) {
          var codeObj = parseCodeRow(data[i], i);
          if (codeObj.code) {
            codes.push(codeObj);
          }
        }
      }

      output = { success: true, codes: codes, count: codes.length };
    }

    // 9. UPSERT SUBSCRIPTION CODE
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

      output = { success: true, message: 'Subscription code saved in Google Sheets' };
    }

    // 10. DELETE SUBSCRIPTION CODE
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

    // 11. DELETE ALL SUBSCRIPTION CODES
    else if (action === 'deleteAllSubscriptionCodes') {
      var cSheet = getOrCreateCodesSheet(ss);
      clearSheetPreserveHeaders(cSheet);
      output = { success: true, message: 'All subscription codes wiped from Google Sheets' };
    }

    // 12. GET SYSTEM SETTINGS
    else if (action === 'getSettings') {
      var sSheet = getOrCreateSettingsSheet(ss);
      var settings = {
        subscriptionRequired: false,
        shopUrl: '',
        updatedAt: Date.now()
      };

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

    // 13. UPSERT SYSTEM SETTINGS
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
      output = { success: true, message: 'Support message stored in Google Sheets' };
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

    // 17. GET COMPLETE DATABASE BACKUP (FULL CLOUD HYDRATION)
    else if (action === 'getBackupData' || action === 'getAll') {
      var restoredUsers = [];
      var restoredCodes = [];
      var restoredSettings = { subscriptionRequired: false, shopUrl: '' };
      var restoredMsgs = [];

      // Users
      var uSheet = getOrCreateUsersSheet(ss);
      if (uSheet.getLastRow() > 1) {
        var uHeaderMap = createHeaderMap(uSheet);
        var uLastCol = Math.max(uSheet.getLastColumn(), 16);
        var uRows = uSheet.getRange(2, 1, uSheet.getLastRow() - 1, uLastCol).getValues();
        for (var i = 0; i < uRows.length; i++) {
          var userObj = parseUserRow(uRows[i], uHeaderMap, i);
          if (userObj && (userObj.id || userObj.username || userObj.email || userObj.name)) {
            restoredUsers.push(userObj);
          }
        }
      }

      // Codes
      var cSheet = getOrCreateCodesSheet(ss);
      if (cSheet.getLastRow() > 1) {
        var cHeaderMap = createHeaderMap(cSheet);
        var cLastCol = Math.max(cSheet.getLastColumn(), 10);
        var cRows = cSheet.getRange(2, 1, cSheet.getLastRow() - 1, cLastCol).getValues();
        for (var j = 0; j < cRows.length; j++) {
          var codeObj = parseCodeRow(cRows[j], cHeaderMap, j);
          if (codeObj && codeObj.code) restoredCodes.push(codeObj);
        }
      }

      // Settings
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

      // Support Tickets
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

    // 18. FULL SNAPSHOT BACKUP (OVERWRITE/RESTORE ALL)
    else if (action === 'backupAll') {
      var data = params.data || {};
      var stats = { usersCount: 0, codesCount: 0, settingsUpdated: false, messagesCount: 0 };

      // Users
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

      // Codes
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

      // Settings
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

      logActivity(ss, 'Full Snapshot Backup', 'Synced ' + stats.usersCount + ' users, ' + stats.codesCount + ' codes.');
      output = {
        success: true,
        status: 'ok',
        message: 'Complete snapshot backed up to Google Sheets Cloud Data Server!',
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
      message: error.toString(),
      stack: error.stack
    };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------------
// HELPER METHODS: ROW PARSING & SCHEMA SETUP
// -------------------------------------------------------------

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
    // If sheet exists, ensure headers match the latest schema
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

function logActivity(ss, eventType, details) {
  try {
    var logSheet = ss.getSheetByName('Backup_Logs');
    if (!logSheet) {
      logSheet = ss.insertSheet('Backup_Logs');
      logSheet.appendRow(['Timestamp', 'Event Type', 'Details']);
      formatHeaderRow(logSheet, 3, '#475569');
    }
    logSheet.appendRow([new Date().toISOString(), eventType, details]);
    if (logSheet.getLastRow() > 500) {
      logSheet.deleteRow(2);
    }
  } catch(e) {}
}
