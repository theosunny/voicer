import path from 'path'

const config = {
  projectName: 'koubo-frontend',
  date: '2026-7-7',
  designWidth: 375,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
    375: 2 / 1,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-framework-react'],
  defineConstants: {
    'process.env.TARO_APP_API_BASE': JSON.stringify('http://127.0.0.1:8080'),
  },
  copy: {
    patterns: [
      { from: 'src/assets/icons/', to: 'dist/assets/icons/' },
    ],
    options: {},
  },
  framework: 'react',
  compiler: {
    type: 'webpack5',
    prebundle: { enable: false },
  },
  cache: {
    enable: false,
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
}

export default function (merge: Function) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev').default)
  }
  return merge({}, config, require('./prod').default)
}
