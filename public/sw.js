// 极简 Service Worker:只为满足"添加到主屏幕/安装"的条件,不做离线缓存。
// 故意不缓存任何资源——发新版 dist 后用户刷新即生效,永远不会拿到过期页面。
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
// 不注册 fetch 监听:空的 fetch 处理器也会让每个请求先等 SW 启动,手机上明显拖慢;
// 现在浏览器安装 PWA 已不再要求 fetch 处理器。
