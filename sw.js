'use strict';
const CACHE = 'koryosan-static-v14';
const ASSETS = [
  './','./index.html','./manifest.webmanifest',
  './styles.css?v=14','./firebase-auth.css?v=14','./firebase-config.js?v=14','./cloud-model.js?v=14','./firebase-client.js?v=14','./songs.js?v=14','./details.js?v=14','./metronome.js?v=14','./app.js?v=14',
  './r2-bar-player.css?v=14','./r2-audio-client.js?v=14','./r2-bar-player.js?v=14','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('koryosan-static-')&&key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  if(new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(request);
      if(response.ok)void cache.put(request,response.clone()).catch(()=>{});
      return response;
    }catch(_){
      return (await cache.match(request)) || (request.mode==='navigate'?await cache.match('./index.html'):Response.error());
    }
  })());
});
