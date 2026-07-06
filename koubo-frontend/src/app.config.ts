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
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#080810',
    navigationBarTitleText: '口播创作',
    navigationBarTextStyle: 'white',
    backgroundColor: '#080810',
  },
  tabBar: {
    color: '#555555',
    selectedColor: '#6C63FF',
    backgroundColor: '#0E0E1A',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/index/index', text: '首页', iconPath: 'assets/icons/home.png', selectedIconPath: 'assets/icons/home-active.png' },
      { pagePath: 'pages/create/index', text: '创作', iconPath: 'assets/icons/create.png', selectedIconPath: 'assets/icons/create-active.png' },
      { pagePath: 'pages/videos/index', text: '作品', iconPath: 'assets/icons/video.png', selectedIconPath: 'assets/icons/video-active.png' },
      { pagePath: 'pages/profile/index', text: '我的', iconPath: 'assets/icons/profile.png', selectedIconPath: 'assets/icons/profile-active.png' },
    ],
  },
})
