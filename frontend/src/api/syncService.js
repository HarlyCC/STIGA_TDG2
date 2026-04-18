import { syncForward } from './api'

const PENDING_KEY = 'stiga_pending_syncs'

// ── Almacenamiento local ──────────────────────────────────────────────────────

function getPending() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
  } catch {
    return []
  }
}

function setPending(records) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(records))
}

function removePending(sessionId) {
  setPending(getPending().filter(r => r.sessionId !== sessionId))
}

export function getPendingCount() {
  return getPending().length
}

// ── Guardar offline ───────────────────────────────────────────────────────────

export function saveOffline(sessionId, patientData, triageResult) {
  const pending = getPending()
  const exists  = pending.some(r => r.sessionId === sessionId)
  if (exists) return

  pending.push({
    sessionId,
    patientData,
    triageResult,
    savedAt: new Date().toISOString(),
  })
  setPending(pending)
  console.log(`[STIGA] Registro guardado offline: ${sessionId}`)
}

// ── Sincronizar pendientes ────────────────────────────────────────────────────

export async function syncPending() {
  const pending = getPending()
  if (pending.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const record of pending) {
    try {
      await syncForward(record.sessionId, record.patientData, record.triageResult)
      removePending(record.sessionId)
      synced++
      console.log(`[STIGA] Sincronizado: ${record.sessionId}`)
    } catch {
      failed++
      break // Sin red, no continuar
    }
  }

  return { synced, failed }
}

// ── Sincronizar un registro (con fallback offline) ────────────────────────────

export async function syncOrSaveOffline(sessionId, patientData, triageResult) {
  try {
    await syncForward(sessionId, patientData, triageResult)
    return { status: 'synced' }
  } catch {
    saveOffline(sessionId, patientData, triageResult)
    return { status: 'offline' }
  }
}

// ── Listener de reconexión ────────────────────────────────────────────────────

export function initSyncOnReconnect(onSynced) {
  window.addEventListener('online', async () => {
    console.log('[STIGA] Conexión restaurada — sincronizando pendientes...')
    const result = await syncPending()
    if (result.synced > 0 && onSynced) onSynced(result.synced)
  })
}
