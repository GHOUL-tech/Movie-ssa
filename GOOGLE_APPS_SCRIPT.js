/**
 * =========================================================================
 * ZINOVIS STREAMING ENGINE - GOOGLE SHEETS BACKUP & RECOVERY WEB APP
 * =========================================================================
 * 
 * INSTRUCTIONS TO DEPLOY (Takes ~30 seconds):
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Rename the Spreadsheet to "Zinovis Streaming Cloud Backup"
 * 3. In the top menu, click: Extensions > Apps Script
 * 4. Delete any code in Code.gs and paste THIS entire script file.
 * 5. Click "Deploy" > "New deployment"
 * 6. Under "Select type", choose "Web app"
 * 7. Set:
 *    - Description: "Zinovis Realtime Backup Webhook"
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone" (Required so your app can post realtime data)
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
        message: 'Zinovis Google Sheets Real-Time Backup System is online and healthy!',
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
            c.isRedeemed || 'Active (Available)',
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
      logBackupActivity(ss, 'Full Snapshot Backup', 'Synced ' + stats.usersCount + ' users, ' + stats.codesCount + ' codes.');

      output = {
        success: true,
        status: 'ok',
        message: 'Snapshot backed up successfully to Google Sheets!',
        stats: stats,
        spreadsheetUrl: ss.getUrl(),
        timestamp: new Date().getTime()
      };
    }
    // 3. REAL-TIME USER UPSERT
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

      logBackupActivity(ss, 'Realtime User Sync', 'Upserted user: ' + (u.name || u.username || u.id));
      output = { success: true, message: 'User updated in Google Sheets in realtime' };
    }
    // 4. REAL-TIME VIP PASSCODE UPSERT
    else if (action === 'upsertSubscriptionCode' && params.code) {
      var c = params.code;
      var cSheet = getOrCreateSheet(ss, 'Subscription_Codes', [
        'Code ID', 'Passcode Key', 'Tier', 'Duration (Days)', 
        'Status', 'Redeemed By', 'Redeemed Date', 'Created Date', 'Notes', 'Last Synced'
      ], '#831843');

      var foundCodeRow = -1;
      var lastCodeRow = cSheet.getLastRow();
      if (lastCodeRow > 1) {
        var codeIds = cSheet.getRange(2, 1, lastCodeRow - 1, 2).getValues();
        for (var j = 0; j < codeIds.length; j++) {
          if (codeIds[j][0] === c.id || codeIds[j][1] === c.code) {
            foundCodeRow = j + 2;
            break;
          }
        }
      }

      var codeRowData = [
        c.id || '',
        c.code || '',
        c.tier || '',
        c.durationDays || 0,
        c.isRedeemed || 'Active (Available)',
        c.redeemedBy || '',
        c.redeemedAt || '',
        c.createdAt || '',
        c.note || '',
        new Date().toISOString()
      ];

      if (foundCodeRow > 1) {
        cSheet.getRange(foundCodeRow, 1, 1, codeRowData.length).setValues([codeRowData]);
      } else {
        cSheet.appendRow(codeRowData);
      }

      logBackupActivity(ss, 'Realtime VIP Code Sync', 'Updated code: ' + (c.code || c.id));
      output = { success: true, message: 'VIP code updated in Google Sheets in realtime' };
    }
    // 5. REAL-TIME SUPPORT MESSAGE APPEND
    else if (action === 'upsertSupportMessage' && params.message) {
      var m = params.message;
      var supSheet = getOrCreateSheet(ss, 'Support_Tickets', [
        'Message ID', 'User ID', 'User Name', 'Email', 'Sender', 'Message Text', 'Read Status', 'Created Date'
      ], '#312e81');

      supSheet.appendRow([
        m.id || ('msg_' + Date.now()),
        m.userId || '',
        m.userName || '',
        m.userEmail || '',
        m.sender || 'user',
        m.message || '',
        m.read || 'No',
        m.createdAt || new Date().toISOString()
      ]);

      output = { success: true, message: 'Support message logged to Google Sheets in realtime' };
    }
    // 6. REAL-TIME SETTINGS UPSERT
    else if (action === 'upsertSettings' && params.settings) {
      var setSheet = getOrCreateSheet(ss, 'Settings', [
        'Setting Key', 'Value', 'Last Updated'
      ], '#065f46');

      clearSheetRowsPreserveHeader(setSheet);
      var sRows = [
        ['Subscription Gate Required', params.settings.subscriptionRequired ? 'Yes' : 'No', new Date().toISOString()],
        ['VIP Store Shop URL', params.settings.shopUrl || '', new Date().toISOString()],
        ['Last Engine Backup Timestamp', new Date().toISOString(), new Date().toISOString()]
      ];
      setSheet.getRange(2, 1, sRows.length, sRows[0].length).setValues(sRows);
      output = { success: true, message: 'Settings synced to Google Sheets in realtime' };
    }
    // 7. RETRIEVE BACKUP DATA (DISASTER RECOVERY / RESTORE)
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

      var cSheetObj = ss.getSheetByName('Subscription_Codes');
      if (cSheetObj && cSheetObj.getLastRow() > 1) {
        var cValues = cSheetObj.getRange(2, 1, cSheetObj.getLastRow() - 1, 10).getValues();
        for (var l = 0; l < cValues.length; l++) {
          var cRow = cValues[l];
          if (cRow[0] || cRow[1]) {
            restoredCodes.push({
              id: String(cRow[0] || ('code_' + l)),
              code: String(cRow[1]),
              tier: (cRow[2] || '1-Month VIP'),
              durationDays: Number(cRow[3] || 30),
              isRedeemed: cRow[4] === 'Redeemed',
              redeemedBy: cRow[5] ? { userName: String(cRow[5]), userEmail: '' } : undefined,
              redeemedAt: cRow[6] ? new Date(cRow[6]).getTime() : undefined,
              createdAt: cRow[7] ? new Date(cRow[7]).getTime() : new Date().getTime(),
              note: String(cRow[8] || '')
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
