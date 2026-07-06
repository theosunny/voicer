/// <reference types="@tarojs/taro" />

export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/create/index',
    'pages/videos/index',
    'pages/profile/index',
    'pages/script/generate',
    'pages/script/edit',
    'pages/record/index',
    'pages/video/status',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F0EDE8',
    navigationBarTitleText: '口播创作',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F0EDE8',
  },
  tabBar: {
    color: '#A8A8B4',
    selectedColor: '#5B6ABF',
    backgroundColor: 'rgba(248,246,242,0.95)',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/index/index', text: '首页', iconPath: 'assets/icons/home.png', selectedIconPath: 'assets/icons/home-active.png' },
      { pagePath: 'pages/create/index', text: '创作', iconPath: 'assets/icons/create.png', selectedIconPath: 'assets/icons/create-active.png' },
      { pagePath: 'pages/videos/index', text: '作品', iconPath: 'assets/icons/video.png', selectedIconPath: 'assets/icons/video-active.png' },
      { pagePath: 'pages/profile/index', text: '我的', iconPath: 'assets/icons/profile.png', selectedIconPath: 'assets/icons/profile-active.png' },
    ],
  },
  permission: {
    'scope.camera': {
      desc: '需要使用摄像头录制视频',
    },
    'scope.record': {
      desc: '需要录制音频进行语音识别',
    },
  },
})
