/// <reference types="@tarojs/taro" />

export default defineAppConfig({
  pages: [
    'pages/login/index',
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
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: '口播创作',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F5F5F5',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#FE2C55',
    backgroundColor: '#FFFFFF',
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
    'scope.writePhotosAlbum': {
      desc: '需要保存视频到相册',
    },
  },
})
