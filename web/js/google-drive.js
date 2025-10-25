/**
 * Google Drive API 유틸리티
 * Google Drive에 데이터를 저장하고 불러오는 기능
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';
const APP_FOLDER_NAME = 'AIcrew.INFO';

// Access Token 캐시
let cachedAccessToken = null;
let tokenExpiryTime = null;
let tokenRequestPromise = null; // 진행 중인 토큰 요청 Promise

/**
 * Access Token 가져오기 (캐싱 지원)
 * @param {boolean} forceRefresh - 강제로 새 토큰 요청
 * @returns {Promise<string>} Access Token
 */
async function getAccessToken(forceRefresh = false) {
  // 캐시된 토큰이 있고 만료되지 않았으면 재사용
  if (!forceRefresh && cachedAccessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    console.log('Using cached access token');
    return cachedAccessToken;
  }

  // 이미 진행 중인 토큰 요청이 있으면 그 결과를 기다림
  if (tokenRequestPromise) {
    console.log('Waiting for ongoing token request...');
    return await tokenRequestPromise;
  }

  console.log('Requesting new access token...');
  
  tokenRequestPromise = new Promise((resolve, reject) => {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      reject(new Error('Google API not loaded'));
      return;
    }

    // 타임아웃 설정 (60초)
    const timeout = setTimeout(() => {
      tokenRequestPromise = null;
      reject(new Error('Access token request timeout - user may have closed the popup'));
    }, 60000);

    const client = google.accounts.oauth2.initTokenClient({
      client_id: '1016430465809-epuv90k71k4v76psln4ksaqbhfkpdmfb.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/drive.file',
      prompt: '', // 빈 문자열로 설정하면 필요시에만 프롬프트 표시
      callback: (response) => {
        clearTimeout(timeout); // 타임아웃 취소
        
        if (response.error) {
          tokenRequestPromise = null; // 실패 시 초기화
          reject(new Error(response.error));
        } else {
          // 토큰 캐싱 (expires_in은 초 단위, 보통 3600초 = 1시간)
          cachedAccessToken = response.access_token;
          // 안전을 위해 만료 시간보다 5분 일찍 갱신하도록 설정
          const expiresIn = (response.expires_in || 3600) * 1000;
          tokenExpiryTime = Date.now() + expiresIn - (5 * 60 * 1000);
          console.log('Access token cached successfully');
          
          tokenRequestPromise = null; // 성공 시 초기화
          resolve(response.access_token);
        }
      },
    });

    client.requestAccessToken();
  });

  return await tokenRequestPromise;
}

/**
 * 현재 인증 상태 확인 (팝업 없이)
 * @returns {boolean} 캐시된 토큰이 유효한지 여부
 */
export function isAuthenticated() {
  return cachedAccessToken && tokenExpiryTime && Date.now() < tokenExpiryTime;
}

/**
 * Google Drive 인증 상태 확인 및 사전 인증
 * @returns {Promise<boolean>} 인증 성공 여부
 */
export async function ensureDriveAuthentication() {
  try {
    await getAccessToken();
    return true;
  } catch (error) {
    console.error('Failed to authenticate with Google Drive:', error);
    return false;
  }
}

/**
 * 앱 전용 폴더 찾기 또는 생성
 * @param {string} accessToken - Google Access Token
 * @returns {Promise<string>} 폴더 ID
 */
async function getOrCreateAppFolder(accessToken) {
  try {
    // 기존 폴더 검색
    const searchResponse = await fetch(
      `${DRIVE_API_BASE}/files?q=name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // 폴더가 없으면 생성
    const createResponse = await fetch(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: APP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    const createData = await createResponse.json();
    return createData.id;
  } catch (error) {
    console.error('Error getting/creating app folder:', error);
    throw error;
  }
}

/**
 * 서브폴더 찾기 또는 생성
 * @param {string} accessToken - Google Access Token
 * @param {string} parentFolderId - 부모 폴더 ID
 * @param {string} subFolderName - 서브폴더 이름
 * @returns {Promise<string>} 서브폴더 ID
 */
async function getOrCreateSubFolder(accessToken, parentFolderId, subFolderName) {
  try {
    // 기존 서브폴더 검색
    const searchResponse = await fetch(
      `${DRIVE_API_BASE}/files?q=name='${subFolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // 서브폴더가 없으면 생성
    const createResponse = await fetch(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: subFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      }),
    });

    const createData = await createResponse.json();
    return createData.id;
  } catch (error) {
    console.error('Error getting/creating subfolder:', error);
    throw error;
  }
}

/**
 * Google Drive에 JSON 데이터 저장
 * AIcrew.INFO/settings 폴더에 저장
 * @param {string} fileName - 저장할 파일명
 * @param {Object} data - 저장할 데이터 객체
 * @returns {Promise<Object>} 저장된 파일 정보
 */
export async function saveToGoogleDrive(fileName, data) {
  try {
    const accessToken = await getAccessToken();
    const appFolderId = await getOrCreateAppFolder(accessToken);
    // AIcrew.INFO 아래에 settings 서브폴더 생성
    const settingsFolderId = await getOrCreateSubFolder(accessToken, appFolderId, 'settings');

    // 기존 파일 확인 (settings 폴더 내에서)
    const searchResponse = await fetch(
      `${DRIVE_API_BASE}/files?q=name='${fileName}' and '${settingsFolderId}' in parents and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const searchData = await searchResponse.json();
    const existingFileId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;

    // JSON 데이터 준비
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    let url, method, metadata;
    
    if (existingFileId) {
      // 기존 파일 업데이트 - parents 필드 제외
      metadata = {
        name: fileName,
        mimeType: 'application/json',
      };
      url = `${UPLOAD_API_BASE}/files/${existingFileId}?uploadType=multipart`;
      method = 'PATCH';
    } else {
      // 새 파일 생성 - parents 필드 포함 (settings 폴더)
      metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [settingsFolderId],
      };
      url = `${UPLOAD_API_BASE}/files?uploadType=multipart`;
      method = 'POST';
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', jsonBlob);

    const uploadResponse = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`Drive upload failed: ${errorData.error?.message || uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();
    console.log('File saved to Google Drive:', result);
    return result;
  } catch (error) {
    console.error('Error saving to Google Drive:', error);
    throw error;
  }
}

/**
 * Google Drive에서 JSON 데이터 불러오기
 * AIcrew.INFO/settings 폴더에서 불러오기
 * @param {string} fileName - 불러올 파일명
 * @returns {Promise<Object>} 불러온 데이터 객체
 */
export async function loadFromGoogleDrive(fileName) {
  try {
    const accessToken = await getAccessToken();
    const appFolderId = await getOrCreateAppFolder(accessToken);
    // AIcrew.INFO 아래에 settings 서브폴더 생성
    const settingsFolderId = await getOrCreateSubFolder(accessToken, appFolderId, 'settings');

    // 파일 검색 (settings 폴더 내에서)
    const searchResponse = await fetch(
      `${DRIVE_API_BASE}/files?q=name='${fileName}' and '${settingsFolderId}' in parents and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const searchData = await searchResponse.json();

    if (!searchData.files || searchData.files.length === 0) {
      throw new Error('File not found in Google Drive');
    }

    const fileId = searchData.files[0].id;

    // 파일 내용 다운로드
    const downloadResponse = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!downloadResponse.ok) {
      throw new Error(`Failed to download file: ${downloadResponse.statusText}`);
    }

    const data = await downloadResponse.json();
    console.log('File loaded from Google Drive:', data);
    return data;
  } catch (error) {
    console.error('Error loading from Google Drive:', error);
    throw error;
  }
}

/**
 * Google Drive에서 파일 목록 가져오기
 * @returns {Promise<Array>} 파일 목록
 */
export async function listFilesFromGoogleDrive() {
  try {
    const accessToken = await getAccessToken();
    const folderId = await getOrCreateAppFolder(accessToken);

    const response = await fetch(
      `${DRIVE_API_BASE}/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,createdTime,modifiedTime,size)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing files from Google Drive:', error);
    throw error;
  }
}

/**
 * 사용자 데이터를 Google Drive에 저장하고 다시 불러오기 (통합 함수)
 * AIcrew.INFO/settings 폴더 사용
 * 토큰을 한 번만 요청하여 두 번 팝업이 뜨는 것을 방지
 * @param {string} fileName - 저장할 파일명
 * @param {Object} data - 저장할 데이터 객체
 * @returns {Promise<Object>} 저장 후 다시 불러온 데이터
 */
export async function saveAndLoadFromGoogleDrive(fileName, data) {
  try {
    // 토큰 한 번만 요청
    const accessToken = await getAccessToken();
    const appFolderId = await getOrCreateAppFolder(accessToken);
    // AIcrew.INFO 아래에 settings 서브폴더 생성
    const settingsFolderId = await getOrCreateSubFolder(accessToken, appFolderId, 'settings');

    // 기존 파일 확인 (settings 폴더 내에서)
    const searchResponse = await fetch(
      `${DRIVE_API_BASE}/files?q=name='${fileName}' and '${settingsFolderId}' in parents and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const searchData = await searchResponse.json();
    const existingFileId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;

    // JSON 데이터 준비
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    let url, method, metadata;
    
    if (existingFileId) {
      // 기존 파일 업데이트 - parents 필드 제외
      metadata = {
        name: fileName,
        mimeType: 'application/json',
      };
      url = `${UPLOAD_API_BASE}/files/${existingFileId}?uploadType=multipart`;
      method = 'PATCH';
    } else {
      // 새 파일 생성 - parents 필드 포함 (settings 폴더)
      metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [settingsFolderId],
      };
      url = `${UPLOAD_API_BASE}/files?uploadType=multipart`;
      method = 'POST';
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', jsonBlob);

    // 저장
    const uploadResponse = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`Drive upload failed: ${errorData.error?.message || uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('File saved to Google Drive:', uploadResult);

    // 저장된 파일 다시 불러오기
    const fileId = uploadResult.id;
    const downloadResponse = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!downloadResponse.ok) {
      throw new Error(`Failed to download file: ${downloadResponse.statusText}`);
    }

    const loadedData = await downloadResponse.json();
    console.log('File loaded from Google Drive:', loadedData);
    return loadedData;
  } catch (error) {
    console.error('Error in saveAndLoadFromGoogleDrive:', error);
    throw error;
  }
}

/**
 * 파일을 Google Drive에 업로드하고 공유 가능한 URL 반환
 * AIcrew.INFO/files/{sessionId} 폴더에 저장
 * @param {File} file - 업로드할 파일 객체
 * @param {string} fileName - 저장할 파일명 (선택사항)
 * @param {string} sessionId - 세션 ID (폴더 구분용)
 * @returns {Promise<Object>} 파일 정보와 URL { fileId, fileName, webViewLink, webContentLink, isDuplicate }
 */
export async function uploadFileToDrive(file, fileName = null, sessionId = null) {
  try {
    const accessToken = await getAccessToken();
    const appFolderId = await getOrCreateAppFolder(accessToken);
    // AIcrew.INFO 아래에 files 서브폴더 생성
    const filesFolderId = await getOrCreateSubFolder(accessToken, appFolderId, 'files');
    
    // files 폴더 아래에 sessionId 서브폴더 생성 (sessionId가 제공된 경우)
    let targetFolderId = filesFolderId;
    if (sessionId) {
      targetFolderId = await getOrCreateSubFolder(accessToken, filesFolderId, sessionId);
    }

    const finalFileName = fileName || file.name;
    
    // 1단계: 같은 이름의 파일이 이미 존재하는지 확인 (targetFolderId에서)
    const searchResponse = await fetch(
      `${DRIVE_API_BASE}/files?q=name='${encodeURIComponent(finalFileName)}' and '${targetFolderId}' in parents and trashed=false&fields=files(id,name,size,webViewLink,webContentLink,mimeType)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!searchResponse.ok) {
      console.warn('Failed to search for existing files, proceeding with upload');
    } else {
      const searchData = await searchResponse.json();
      
      if (searchData.files && searchData.files.length > 0) {
        // 같은 이름과 크기의 파일이 존재하는지 확인
        const existingFile = searchData.files.find(f => f.size == file.size);
        
        if (existingFile) {
          console.log('File with same name and size already exists:', existingFile);
          return {
            fileId: existingFile.id,
            fileName: existingFile.name,
            webViewLink: existingFile.webViewLink,
            webContentLink: existingFile.webContentLink,
            mimeType: existingFile.mimeType,
            size: existingFile.size,
            isDuplicate: true,
            alreadyExists: true,
          };
        }
      }
    }
    
    // 2단계: 중복이 아니면 업로드 진행
    // 메타데이터 준비 (targetFolderId를 parent로 설정)
    const metadata = {
      name: finalFileName,
      mimeType: file.type || 'application/octet-stream',
      parents: [targetFolderId],
    };

    // FormData로 multipart 업로드
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const uploadResponse = await fetch(`${UPLOAD_API_BASE}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`Drive upload failed: ${errorData.error?.message || uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileId = uploadResult.id;

    // 파일을 공유 가능하도록 설정 (Anyone with link can view)
    await fetch(`${DRIVE_API_BASE}/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });

    // 파일 정보 가져오기 (webViewLink 포함)
    const fileInfoResponse = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?fields=id,name,webViewLink,webContentLink,mimeType,size`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!fileInfoResponse.ok) {
      throw new Error(`Failed to get file info: ${fileInfoResponse.statusText}`);
    }

    const fileInfo = await fileInfoResponse.json();
    console.log('File uploaded to Google Drive:', fileInfo);

    return {
      fileId: fileInfo.id,
      fileName: fileInfo.name,
      webViewLink: fileInfo.webViewLink,
      webContentLink: fileInfo.webContentLink,
      mimeType: fileInfo.mimeType,
      size: fileInfo.size,
      isDuplicate: false,
      alreadyExists: false,
    };
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    throw error;
  }
}
