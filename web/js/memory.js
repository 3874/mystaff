// memory.js
// LTM (Long Term Memory) 관리

import { getDataByKey, updateLTMInDB, deleteData } from './database.js';

export async function loadLTM(sessionId) {
  return await getDataByKey('LTM', sessionId);
}

export async function updateLTM(sessionId, newLTM) {
  // Now using the dedicated updateLTM function from database.js
  await updateLTMInDB(sessionId, newLTM);
}

export async function deleteLTM(sessionId) {
  await deleteData('LTM', sessionId);
}