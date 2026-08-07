const https = require('https');

https.get('https://api.github.com/repos/Dineshkumar2006471/Intelli-Asha/actions/runs?per_page=1', {
  headers: {
    'User-Agent': 'Node.js',
    'Accept': 'application/vnd.github+json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const runs = JSON.parse(data).workflow_runs;
    const latestRun = runs[0];
    console.log(`Latest Run ID: ${latestRun.id}, SHA: ${latestRun.head_sha}, Status: ${latestRun.status}, Conclusion: ${latestRun.conclusion}`);
    
    https.get(`https://api.github.com/repos/Dineshkumar2006471/Intelli-Asha/actions/runs/${latestRun.id}/jobs`, {
      headers: {
        'User-Agent': 'Node.js',
        'Accept': 'application/vnd.github+json'
      }
    }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        const jobs = JSON.parse(data2).jobs;
        for (const job of jobs) {
          if (job.conclusion === 'failure') {
            console.log(`\nFAILED JOB: ${job.name}`);
            for (const step of job.steps) {
              if (step.conclusion === 'failure') {
                console.log(`  FAILED STEP: ${step.name}`);
              }
            }
          }
        }
      });
    });
  });
}).on('error', err => console.error(err));
