import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  astro: true,
  unocss: true,
  ignores: ['src/content/**', 'note/**'],
  rules: {
    'e18e/prefer-static-regex': 'off',
  },
})
