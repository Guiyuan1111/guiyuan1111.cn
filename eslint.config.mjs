import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  astro: true,
  unocss: true,
  // src/content/** 是站点正文；note/** 是文档；备份/** 是停用功能归档与本地源材料，均不参与代码检查
  ignores: ['src/content/**', 'note/**', '备份/**'],
  rules: {
    'e18e/prefer-static-regex': 'off',
  },
})
