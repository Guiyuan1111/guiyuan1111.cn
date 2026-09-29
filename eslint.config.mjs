import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  astro: true,
  unocss: true,
  // src/content/** 是站点正文；note/** 是文档；备份/** 是停用功能归档与本地源材料，
  // benchmark/results/** 是基准程序生成的数据快照——均不参与代码检查
  ignores: ['src/content/**', 'note/**', '备份/**', 'benchmark/results/**'],
  rules: {
    'e18e/prefer-static-regex': 'off',
  },
  // benchmark/** 是命令行基准脚本，console 输出即其用户界面，其余规则照常生效
}, {
  files: ['benchmark/**/*.mjs'],
  rules: {
    'no-console': 'off',
  },
})
