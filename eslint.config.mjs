import antfu from '@antfu/eslint-config'

export default antfu({
  nextjs: true,
  rules: {
    // Next.js exposes process as a global in its runtime; importing it from
    // node:process everywhere adds noise without value in this codebase.
    'node/prefer-global/process': 'off',
  },
})
