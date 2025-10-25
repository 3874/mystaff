/**
 * Google Drive 동기화 통합 함수
 * 로그인 시 한 번의 토큰 요청으로 신규/기존 사용자 처리
 */

import { saveAndLoadFromGoogleDrive, loadFromGoogleDrive } from './google-drive.js';

/**
 * 로그인 시 사용자 데이터 동기화
 * 신규 사용자는 저장 후 불러오기, 기존 사용자는 불러오기만 수행
 * 한 번의 토큰 요청으로 모든 작업 처리
 * 
 * @param {boolean} isNewUser - 신규 사용자 여부
 * @param {string} fileName - 파일명
 * @param {Object} userData - 사용자 데이터 (신규 사용자인 경우)
 * @returns {Promise<Object>} 동기화된 사용자 데이터
 */
export async function syncUserDataOnLogin(isNewUser, fileName, userData = null) {
  if (isNewUser && !userData) {
    throw new Error('userData is required for new users');
  }

  try {
    if (isNewUser) {
      // 신규 사용자: 저장 후 불러오기 (내부적으로 토큰 한 번만 요청)
      console.log('Syncing new user data...');
      return await saveAndLoadFromGoogleDrive(fileName, userData);
    } else {
      // 기존 사용자: 불러오기만 (이미 캐시된 토큰 사용)
      console.log('Syncing existing user data...');
      return await loadFromGoogleDrive(fileName);
    }
  } catch (error) {
    console.error('Failed to sync user data:', error);
    throw error;
  }
}
