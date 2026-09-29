function createOtpState() {
  return {
    entries: new Map()
  };
}

function normalizeKey(key) {
  return String(key || '').trim().toLowerCase();
}

function getStateEntry(state, key) {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return null;
  return state.entries.get(normalizedKey) || null;
}

function buildRetryMessage(retryAfterMs, fallbackMessage) {
  if (!retryAfterMs || retryAfterMs <= 0) {
    return fallbackMessage;
  }

  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return `${fallbackMessage} Gerageza mu masegonda ${seconds}.`;
}

function canIssueOtp(state, key, options = {}) {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) {
    return { ok: false, error: 'OTP key irakenewe.' };
  }

  const entry = getStateEntry(state, normalizedKey) || {
    requests: [],
    expiresAt: 0,
    attempts: 0,
    lastIssuedAt: 0,
    lockUntil: 0,
    code: ''
  };
  const now = Date.now();
  const windowMs = Number(options.windowMs || 60000);
  const maxRequests = Number(options.maxRequests || 3);
  const cooldownMs = Number(options.cooldownMs || 30000);

  if (entry.lockUntil && now < entry.lockUntil) {
    const retryAfterMs = entry.lockUntil - now;
    return {
      ok: false,
      error: buildRetryMessage(retryAfterMs, 'Too many invalid OTP attempts. Please wait.'),
      retryAfterMs
    };
  }

  const activeRequests = (entry.requests || []).filter((ts) => now - ts < windowMs);
  if (activeRequests.length >= maxRequests) {
    const oldest = Math.min(...activeRequests);
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    return {
      ok: false,
      error: buildRetryMessage(retryAfterMs, 'OTP requests are rate-limited. Please wait before requesting another code.'),
      retryAfterMs
    };
  }

  if (entry.lastIssuedAt && now - entry.lastIssuedAt < cooldownMs) {
    const retryAfterMs = cooldownMs - (now - entry.lastIssuedAt);
    return {
      ok: false,
      error: buildRetryMessage(retryAfterMs, 'A new OTP code is already active. Please wait a bit before requesting another one.'),
      retryAfterMs
    };
  }

  return { ok: true, retryAfterMs: 0 };
}

function registerOtpCode(state, key, code, validForMs = 10 * 60 * 1000, options = {}) {
  const normalizedKey = normalizeKey(key);
  const now = Date.now();
  const windowMs = Number(options.windowMs || 60000);
  const entry = state.entries.get(normalizedKey) || {
    requests: [],
    expiresAt: 0,
    attempts: 0,
    lastIssuedAt: 0,
    lockUntil: 0,
    code: ''
  };

  entry.requests = (entry.requests || []).filter((ts) => now - ts < windowMs);
  entry.requests.push(now);
  entry.lastIssuedAt = now;
  entry.attempts = 0;
  entry.lockUntil = 0;
  entry.code = String(code).trim();
  const effectiveValidityMs = Number(validForMs || 0);
  entry.expiresAt = effectiveValidityMs > 0 ? now + effectiveValidityMs : now - 1;
  state.entries.set(normalizedKey, entry);

  return {
    ok: true,
    expiresAt: entry.expiresAt,
    code: entry.code
  };
}

function verifyOtpCode(state, key, code, options = {}) {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) {
    return { ok: false, error: 'OTP key irakenewe.' };
  }

  const entry = getStateEntry(state, normalizedKey);
  if (!entry) {
    return { ok: false, error: 'Nta OTP yoherejwe kuri iyi email.' };
  }

  const now = Date.now();
  const maxAttempts = Number(options.maxAttempts || 5);
  const lockMs = Number(options.lockMs || 60000);

  if (entry.lockUntil && now < entry.lockUntil) {
    const retryAfterMs = entry.lockUntil - now;
    return {
      ok: false,
      error: buildRetryMessage(retryAfterMs, 'Too many invalid OTP attempts. Please wait before trying again.'),
      retryAfterMs
    };
  }

  if (!entry.expiresAt || now > entry.expiresAt) {
    state.entries.delete(normalizedKey);
    return { ok: false, error: 'OTP yarangiye. Saba indi.' };
  }

  if (String(code).trim() !== String(entry.code).trim()) {
    entry.attempts = Number(entry.attempts || 0) + 1;
    if (entry.attempts >= maxAttempts) {
      entry.lockUntil = now + lockMs;
    }
    return {
      ok: false,
      error: 'OTP ntabwo ari yo. Gerageza nanone.'
    };
  }

  state.entries.delete(normalizedKey);
  return { ok: true };
}

module.exports = {
  createOtpState,
  normalizeKey,
  canIssueOtp,
  registerOtpCode,
  verifyOtpCode
};
