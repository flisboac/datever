const path = require('path');
const badgesDir = path.join('img', 'badges');
const badges = [
  path.join(badgesDir, 'badge-branches.svg'),
  path.join(badgesDir, 'badge-functions.svg'),
  path.join(badgesDir, 'badge-lines.svg'),
  path.join(badgesDir, 'badge-statements.svg'),
];

module.exports = {
  git: {
    push: false,
    tagName: 'v${version}',
    commitMessage: 'chore(release): release v${version}',
    requireBranch: ['master', 'release'],
  },
  npm: {
    publish: false,
  },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: 'conventionalcommits',
      infile: 'CHANGELOG.md',
    },
  },
  hooks: {
    'before:init': [
      'npm run test:cov',
      'npm run test:cov-badges || echo "*** WARNING: Failed to generate test badges."',
      ...badges.map(badge => `git add "${badge}" || echo "*** WARNING: Ignoring badge file \'${badge}\'."`),
      'npm run docs:readme',
      'git add README.md',
      'npm run git:check-clean || git commit --message "chore(release): update documentation and badges"',
    ],
  },
};
