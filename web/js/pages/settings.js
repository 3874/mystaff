import { getDataByKey, updateData, getAllData } from '../../js/database.js';
import { signOut, getCurrentUser } from '../utils.js';
import { initModeratorChat } from '../moderator-chat.js';
import { initAuthGuard } from '../auth-guard.js';
import { saveToGoogleDrive, loadFromGoogleDrive, saveAndLoadFromGoogleDrive } from '../google-drive.js';

// 백업할 모든 테이블 목록
const DB_TABLES = ['mydata', 'chat', 'LTM', 'myfiles', 'diystaff', 'myinterns'];

$(document).ready(async function() {
    // 인증 체크
    if (!initAuthGuard()) {
        return;
    }

    // Initialize moderator chat functionality
    initModeratorChat();

    await loadSettings();

    $('#settings-form').on('submit', function(e) {
        e.preventDefault();
        saveSettings();
    });

    $('#signOutBtn').on('click', function(e) {
        e.preventDefault();
        signOut();
    });

    // Google Drive Sync 버튼들
    $('#syncUploadBtn').on('click', function(e) {
        e.preventDefault();
        syncUpload();
    });

    $('#syncDownloadBtn').on('click', function(e) {
        e.preventDefault();
        syncDownload();
    });

    $('#syncBothBtn').on('click', function(e) {
        e.preventDefault();
        syncBoth();
    });
});

async function loadSettings() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('User not found.');
            return;
        }
        const userData = await getDataByKey('mydata', user.email);
        if (userData && userData.settings) {
            $('#rag-switch').prop('checked', userData.settings.rag === true);
            $('#long-term-memory-switch').prop('checked', userData.settings.longTermMemory === true);
            $('#file-server-switch').prop('checked', userData.settings.fileServer === true);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Failed to load settings.');
    }
}

async function saveSettings() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('User not found.');
            alert('You must be logged in to save settings.');
            return;
        }

        const settings = {
            rag: $('#rag-switch').is(':checked'),
            longTermMemory: $('#long-term-memory-switch').is(':checked'),
            fileServer: $('#file-server-switch').is(':checked')
        };

        const userData = await getDataByKey('mydata', user.email) || {};
        userData.settings = settings;

        await updateData('mydata', user.email, userData);

        alert('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings.');
    }
}

// Google Drive Sync 함수들
function showSyncStatus(message, type = 'info') {
    const statusDiv = $('#syncStatus');
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    
    statusDiv.html(`<div class="alert ${alertClass} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`);
}

// 테이블의 keyPath 반환
function getKeyPath(tableName) {
    const keyPaths = {
        'mydata': 'myId',
        'chat': 'sessionId',
        'LTM': 'sessionId',
        'myfiles': 'id',
        'diystaff': 'staffId',
        'myinterns': 'staffId'
    };
    return keyPaths[tableName] || 'id';
}

async function syncUpload() {
    try {
        showSyncStatus('<i class="spinner-border spinner-border-sm me-2"></i>Backing up all data to Google Drive...', 'info');
        $('#syncUploadBtn').prop('disabled', true);

        const user = await getCurrentUser();
        if (!user) {
            throw new Error('You must be logged in');
        }

        let successCount = 0;
        let totalRecords = 0;
        const errors = [];

        // 각 테이블을 개별 파일로 백업
        for (const tableName of DB_TABLES) {
            try {
                const tableData = await getAllData(tableName);
                
                // mydata 테이블은 현재 사용자 데이터만 포함
                let dataToBackup;
                if (tableName === 'mydata') {
                    dataToBackup = tableData.filter(item => item.myId === user.email);
                } else {
                    dataToBackup = tableData;
                }

                const backupData = {
                    version: 1,
                    timestamp: new Date().toISOString(),
                    userEmail: user.email,
                    tableName: tableName,
                    records: dataToBackup
                };

                const fileName = `mystaff_${tableName}_${user.email.replace('@', '_at_')}.json`;
                await saveToGoogleDrive(fileName, backupData);
                
                successCount++;
                totalRecords += dataToBackup.length;
                console.log(`Backed up ${dataToBackup.length} records from ${tableName}`);
            } catch (error) {
                console.error(`Failed to backup ${tableName}:`, error);
                errors.push(tableName);
            }
        }

        if (successCount === DB_TABLES.length) {
            showSyncStatus(`✅ Successfully backed up ${totalRecords} records from ${successCount} tables to Google Drive!`, 'success');
        } else {
            showSyncStatus(`⚠️ Partially backed up ${totalRecords} records from ${successCount}/${DB_TABLES.length} tables. Failed: ${errors.join(', ')}`, 'warning');
        }
    } catch (error) {
        console.error('Backup error:', error);
        if (error.message.includes('timeout')) {
            showSyncStatus('⏱️ Request timed out. Please allow access in the popup window and try again.', 'warning');
        } else {
            showSyncStatus(`❌ Backup failed: ${error.message}`, 'error');
        }
    } finally {
        $('#syncUploadBtn').prop('disabled', false);
    }
}

async function syncDownload() {
    try {
        showSyncStatus('<i class="spinner-border spinner-border-sm me-2"></i>Restoring all data from Google Drive...', 'info');
        $('#syncDownloadBtn').prop('disabled', true);

        const user = await getCurrentUser();
        if (!user) {
            throw new Error('You must be logged in');
        }

        let successCount = 0;
        let totalRecords = 0;
        const errors = [];
        const successDetails = [];

        // 각 테이블을 개별 파일에서 복원
        for (const tableName of DB_TABLES) {
            try {
                const fileName = `mystaff_${tableName}_${user.email.replace('@', '_at_')}.json`;
                const backupData = await loadFromGoogleDrive(fileName);

                const records = backupData.records || [];
                
                if (tableName === 'mydata') {
                    // mydata는 현재 사용자 데이터만 복원
                    const userData = records.find(item => item.myId === user.email);
                    if (userData) {
                        await updateData(tableName, user.email, userData);
                        successDetails.push(`${tableName}: 1 record`);
                        totalRecords += 1;
                    }
                } else {
                    // 다른 테이블은 모든 데이터 복원
                    for (const record of records) {
                        const keyPath = getKeyPath(tableName);
                        if (record[keyPath]) {
                            await updateData(tableName, record[keyPath], record);
                        }
                    }
                    successDetails.push(`${tableName}: ${records.length} records`);
                    totalRecords += records.length;
                }
                
                successCount++;
                console.log(`Restored ${records.length} records to ${tableName}`);
            } catch (error) {
                console.error(`Failed to restore ${tableName}:`, error);
                errors.push(tableName);
            }
        }

        const successMsg = successDetails.length > 0 ? successDetails.join(', ') : 'No data';
        const failedMsg = errors.length > 0 ? ` (Failed: ${errors.join(', ')})` : '';
        
        if (successCount === DB_TABLES.length) {
            showSyncStatus(`✅ Successfully restored: ${successMsg}. Please refresh the page.`, 'success');
        } else {
            showSyncStatus(`⚠️ Partially restored: ${successMsg}${failedMsg}. Please refresh the page.`, 'warning');
        }
        
        // 페이지 새로고침 제안
        setTimeout(() => {
            if (confirm('Data restored successfully. Refresh the page to apply changes?')) {
                location.reload();
            }
        }, 1000);
    } catch (error) {
        console.error('Restore error:', error);
        if (error.message.includes('timeout')) {
            showSyncStatus('⏱️ Request timed out. Please allow access in the popup window and try again.', 'warning');
        } else {
            showSyncStatus(`❌ Restore failed: ${error.message}`, 'error');
        }
    } finally {
        $('#syncDownloadBtn').prop('disabled', false);
    }
}

async function syncBoth() {
    try {
        showSyncStatus('<i class="spinner-border spinner-border-sm me-2"></i>Full sync in progress (all tables)...', 'info');
        $('#syncBothBtn').prop('disabled', true);

        const user = await getCurrentUser();
        if (!user) {
            throw new Error('You must be logged in');
        }

        let uploadSuccess = 0;
        let downloadSuccess = 0;
        let totalRecords = 0;
        const errors = [];

        // 각 테이블을 개별적으로 업로드하고 다운로드
        for (const tableName of DB_TABLES) {
            try {
                // 1. 로컬 데이터 수집
                const tableData = await getAllData(tableName);
                
                let dataToSync;
                if (tableName === 'mydata') {
                    dataToSync = tableData.filter(item => item.myId === user.email);
                } else {
                    dataToSync = tableData;
                }

                const backupData = {
                    version: 1,
                    timestamp: new Date().toISOString(),
                    userEmail: user.email,
                    tableName: tableName,
                    records: dataToSync
                };

                // 2. Google Drive에 업로드
                const fileName = `mystaff_${tableName}_${user.email.replace('@', '_at_')}.json`;
                const syncedData = await saveAndLoadFromGoogleDrive(fileName, backupData);
                uploadSuccess++;

                // 3. 동기화된 데이터 복원
                const records = syncedData.records || [];
                
                if (tableName === 'mydata') {
                    const userData = records.find(item => item.myId === user.email);
                    if (userData) {
                        await updateData(tableName, user.email, userData);
                        totalRecords += 1;
                    }
                } else {
                    for (const record of records) {
                        const keyPath = getKeyPath(tableName);
                        if (record[keyPath]) {
                            await updateData(tableName, record[keyPath], record);
                        }
                    }
                    totalRecords += records.length;
                }
                
                downloadSuccess++;
                console.log(`Synced ${records.length} records for ${tableName}`);
            } catch (error) {
                console.error(`Failed to sync ${tableName}:`, error);
                errors.push(tableName);
            }
        }

        if (uploadSuccess === DB_TABLES.length && downloadSuccess === DB_TABLES.length) {
            showSyncStatus(`✅ Full sync completed! ${totalRecords} records synced across ${DB_TABLES.length} tables.`, 'success');
        } else {
            showSyncStatus(`⚠️ Partial sync: ${uploadSuccess}/${DB_TABLES.length} tables synced. ${totalRecords} records. Failed: ${errors.join(', ')}`, 'warning');
        }
    } catch (error) {
        console.error('Full sync error:', error);
        if (error.message.includes('timeout')) {
            showSyncStatus('⏱️ Request timed out. Please allow access in the popup window and try again.', 'warning');
        } else {
            showSyncStatus(`❌ Full sync failed: ${error.message}`, 'error');
        }
    } finally {
        $('#syncBothBtn').prop('disabled', false);
    }
}
