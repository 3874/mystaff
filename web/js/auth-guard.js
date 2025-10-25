/**
 * auth-guard.js
 * 모든 보호된 페이지에서 import하여 사용하는 인증 가드
 */

import { requireAuth, getCurrentUser, getUserDisplayName } from './utils.js';

/**
 * 페이지 로드 시 자동으로 인증 체크
 */
export async function initAuthGuard() {
  // 인증 체크
  if (!requireAuth()) {
    return false;
  }

  // 사용자 정보 로드
  const user = await getCurrentUser();
  console.log('Current user:', user);

  // 사용자 정보를 UI에 표시 (선택적)
  await updateUserUI(user);

  return true;
}

/**
 * UI에 사용자 정보 표시
 * @param {Object} user 사용자 정보
 */
async function updateUserUI(user) {
  if (!user) return;

  // 사용자 이름 표시 (예: 헤더에 표시)
  const displayName = await getUserDisplayName();
  const userNameElements = document.querySelectorAll('[data-user-name]');
  userNameElements.forEach(el => {
    el.textContent = displayName;
  });

  // 사용자 이메일 표시
  const userEmailElements = document.querySelectorAll('[data-user-email]');
  userEmailElements.forEach(el => {
    el.textContent = user.email || '';
  });

  // 프로필 이미지 표시 (Google 로그인인 경우)
  if (user.googleUser?.picture) {
    const profileImageElements = document.querySelectorAll('[data-user-avatar]');
    profileImageElements.forEach(el => {
      if (el.tagName === 'IMG') {
        el.src = user.googleUser.picture;
      } else {
        el.style.backgroundImage = `url(${user.googleUser.picture})`;
      }
    });
  }

  // Google 로그인 사용자 표시
  const googleBadgeElements = document.querySelectorAll('[data-google-user]');
  googleBadgeElements.forEach(el => {
    el.style.display = user.isGoogleUser ? 'inline-block' : 'none';
  });
}

/**
 * 로그인 타입 확인
 * @returns {Promise<string>} 'google' 또는 'email'
 */
export async function getLoginType() {
  const user = await getCurrentUser();
  return user?.isGoogleUser ? 'google' : 'email';
}
