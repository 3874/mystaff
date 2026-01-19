// memory.js
// LTM (Long Term Memory) 관리

import { getDataByKey, deleteData, addData, updateData } from './database.js';

export async function loadLTM(sessionId) {
  return await getDataByKey('LTM', sessionId);
}

export async function deleteLTM(sessionId) {
  await deleteData('LTM', sessionId);
}

export async function updateLTM(sessionId, ltm) {
  await updateData('LTM', sessionId, ltm);
}

