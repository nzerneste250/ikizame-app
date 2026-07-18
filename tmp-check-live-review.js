const https = require('https');
https.get('https://ikizame.rw/exam-result', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('has_stringValue', d.includes('const stringValue = typeof val ==='));
    console.log('has_normalizer', d.includes('normalizeQuestionImageAssetPath(stringValue || '));
    console.log(d.slice(0, 2000));
  });
}).on('error', err => {
  console.error(err);
  process.exit(1);
});
