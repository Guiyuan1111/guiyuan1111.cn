import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  astro: true,
  unocss: true,
  // src/content/** 是站点正文；note/** 是文档；两个 *-backup/** 是停用功能归档，均不参与代码检查
  ignores: ['src/content/**', 'note/**', 'i18n-backup/**', 'comment-backup/**'],
  rules: {
    'e18e/prefer-static-regex': 'off',
  },
})
