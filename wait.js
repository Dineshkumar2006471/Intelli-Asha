const https = require('https');

function check() {
  https.get('https://api.github.com/repos/Dineshkumar2006471/Intelli-Asha/actions/runs', { headers: { 'User-Agent': 'node' } }, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      const r = JSON.parse(data);
      const latest = r.workflow_runs[0];
      console.log('Status:', latest.status, '| Conclusion:', latest.conclusion);
      if (latest.status === 'completed') {
         process.exit(latest.conclusion === 'success' ? 0 : 1);
      }
      setTimeout(check, 10000);
    });
  }).on('error', (e) => {
    console.error(e);
    setTimeout(check, 10000);
  });
}
check();
