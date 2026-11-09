// Conventional Commits with a mandatory issue reference, e.g. `feat(api): add live endpoint (#12)`.
// Merge commits are ignored by commitlint's default ignore rules.
export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'header-issue-reference': ({ header }) => [
          /\(#\d+\)$/.test(header ?? ''),
          'header must end with an issue reference, e.g. "(#12)"',
        ],
      },
    },
  ],
  rules: {
    'header-issue-reference': [2, 'always'],
    'header-max-length': [2, 'always', 100],
  },
};
