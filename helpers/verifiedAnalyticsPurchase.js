const { purchaseReceipt } = require('./siteAnalytics');

// Optional analytics confirmation never changes payment status or entitlement.
function createPurchaseVerifier(findTransaction, { timeoutMs = 2500 } = {}) {
  const cache = new Map();
  return async function verifiedReceipt(row) {
    const receipt = purchaseReceipt(row);
    if (!receipt || row.reference_id.length > 128) return null;
    const key = row.reference_id + ':' + receipt.value;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.promise;
    let timer;
    const promise = Promise.race([
      Promise.resolve().then(() => findTransaction(row.reference_id)),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Analytics confirmation timeout')), timeoutMs); })
    ]).then(transaction => {
      if (transaction?.ref !== row.reference_id || transaction?.status !== 'successful'
          || transaction?.kind !== 'CASHIN' || Number(transaction.amount) !== receipt.value
          || (transaction.currency && transaction.currency !== 'RWF')) return null;
      return receipt;
    }).catch(() => null).finally(() => clearTimeout(timer));
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(key, { promise, expires: Date.now() + 5 * 60 * 1000 });
    return promise;
  };
}

module.exports = { createPurchaseVerifier };
