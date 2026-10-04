const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');

async function checkGit() {
  const isGit = fs.existsSync(path.join(dir, '.git'));
  console.log('Is .git present:', isGit);
  if (!isGit) {
    console.log('No .git directory found. Initializing git repo...');
    await git.init({ fs, dir });
  }

  const status = await git.statusMatrix({ fs, dir });
  console.log(`Git status matrix entries: ${status.length}`);

  // Stage all modified/new files
  for (const [filepath, head, workdir, stage] of status) {
    if (workdir !== 0) {
      await git.add({ fs, dir, filepath });
    } else if (head === 1 && workdir === 0) {
      await git.remove({ fs, dir, filepath });
    }
  }

  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: 'NMDCAT AI Assistant',
      email: 'assistant@nmdcat-prep-pro.internal'
    },
    message: 'feat(mcq-retrieval): Canonical MCQ retrieval service, consumer migrations, and production database audit'
  });

  console.log(`Successfully committed with SHA: ${sha}`);
}

checkGit().catch(err => console.error('Git error:', err));
