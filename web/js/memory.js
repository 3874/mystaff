// memory.js
// LTM (Long Term Memory) 관리

import { getDataByKey, deleteData } from './database.js';

export async function loadLTM(sessionId) {
  return await getDataByKey('LTM', sessionId);
}

export async function deleteLTM(sessionId) {
  await deleteData('LTM', sessionId);
}

export async function saveLTM(sessionId, ltm) {
  await addData('LTM', sessionId, ltm);
}

export async function updateLTM(sessionId, ltm) {
  await updateData('LTM', sessionId, ltm);
}

