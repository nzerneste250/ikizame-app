function evaluateExamAccessState({ session = {}, paymentRows = [], schoolRows = [] }) {
  if (!session || typeof session !== 'object') {
    return { allowed: false, reason: 'Session not initialized.' };
  }

  if (session.isOwnerBypass) {
    return { allowed: true, source: 'owner-bypass', remaining: 1, reason: 'Owner bypass authorized.' };
  }

  if (!session.examPhoneNumber) {
    return { allowed: false, reason: 'No valid exam session found for this learner.' };
  }

  const paymentMatch = (paymentRows || []).find((row) => {
    const rowId = Number(row.id ?? 0);
    const sessionId = Number(session.activePaymentRecordId ?? 0);
    const rowStatus = String(row.status || '').toUpperCase();
    const rowRemaining = Number(row.remaining_exams || 0);
    const rowPhone = String(row.phone_number || '');
    const sessionPhone = String(session.examPhoneNumber || '');

    const sameId = sessionId > 0 ? rowId === sessionId : false;
    const samePhone = sessionPhone && rowPhone && sessionPhone.slice(-9) === rowPhone.slice(-9);
    return (sameId || samePhone) && rowStatus === 'SUCCESS' && rowRemaining > 0;
  });

  if (paymentMatch) {
    return {
      allowed: true,
      source: 'payment',
      remaining: Number(paymentMatch.remaining_exams || 0),
      recordId: Number(paymentMatch.id || 0),
      reason: 'Valid paid exam access found.'
    };
  }

  const schoolMatch = (schoolRows || []).find((row) => {
    const rowId = Number(row.id ?? 0);
    const sessionId = Number(session.assignedStudentId ?? 0);
    const rowStatus = String(row.status || '').toUpperCase();
    const rowAssigned = Number(row.assigned_exams || 0);
    const rowPhone = String(row.phone_number || '');
    const sessionPhone = String(session.examPhoneNumber || '');

    const sameId = sessionId > 0 ? rowId === sessionId : false;
    const samePhone = sessionPhone && rowPhone && sessionPhone.slice(-9) === rowPhone.slice(-9);
    return (sameId || samePhone) && rowStatus === 'ACTIVE' && rowAssigned > 0;
  });

  if (schoolMatch) {
    return {
      allowed: true,
      source: 'school',
      remaining: Number(schoolMatch.assigned_exams || 0),
      recordId: Number(schoolMatch.id || 0),
      reason: 'Valid assigned school exam access found.'
    };
  }

  return {
    allowed: false,
    reason: 'No valid exam access found for this learner.'
  };
}

function verifySessionExamAccess(db, req, callback) {
  if (!req || !req.session) {
    return callback(null, { allowed: false, reason: 'Session not initialized.' });
  }

  if (req.session.isAdminAuthenticated) {
    return callback(null, { allowed: true, source: 'admin', reason: 'Admin access allowed.' });
  }

  if (req.session.isOwnerBypass) {
    return callback(null, { allowed: true, source: 'owner-bypass', reason: 'Owner bypass authorized.' });
  }

  if (!req.session.examStudentName || !req.session.examPhoneNumber) {
    return callback(null, { allowed: false, reason: 'No valid exam session found for this learner.' });
  }

  const phone = String(req.session.examPhoneNumber).trim();
  const last9 = phone.slice(-9);

  db.query(
    `SELECT id, phone_number, status, remaining_exams FROM payment_transactions
     WHERE RIGHT(phone_number, 9) = ? AND status = 'SUCCESS' AND remaining_exams > 0
     ORDER BY id DESC LIMIT 20`,
    [last9],
    (payErr, paymentRows) => {
      if (payErr) return callback(payErr, null);

      const activePaymentRecordId = Number(req.session.activePaymentRecordId || 0);
      const chosenPayment = activePaymentRecordId > 0
        ? (paymentRows || []).find((row) => Number(row.id) === activePaymentRecordId && Number(row.remaining_exams) > 0)
        : (paymentRows || [])[0] || null;

      if (chosenPayment) {
        return callback(null, {
          allowed: true,
          source: 'payment',
          remaining: Number(chosenPayment.remaining_exams || 0),
          recordId: Number(chosenPayment.id || 0),
          reason: 'Valid paid exam access found.'
        });
      }

      db.query(
        `SELECT id, phone_number, status, assigned_exams FROM school_students
         WHERE RIGHT(phone_number, 9) = ? AND status = 'ACTIVE' AND assigned_exams > 0
         ORDER BY id DESC LIMIT 20`,
        [last9],
        (schoolErr, schoolRows) => {
          if (schoolErr) return callback(schoolErr, null);

          const activeStudentId = Number(req.session.assignedStudentId || 0);
          const chosenSchool = activeStudentId > 0
            ? (schoolRows || []).find((row) => Number(row.id) === activeStudentId && Number(row.assigned_exams) > 0)
            : (schoolRows || [])[0] || null;

          if (chosenSchool) {
            return callback(null, {
              allowed: true,
              source: 'school',
              remaining: Number(chosenSchool.assigned_exams || 0),
              recordId: Number(chosenSchool.id || 0),
              reason: 'Valid assigned school exam access found.'
            });
          }

          callback(null, {
            allowed: false,
            reason: 'No valid exam access found for this learner.'
          });
        }
      );
    }
  );
}

module.exports = {
  evaluateExamAccessState,
  verifySessionExamAccess
};
