'use strict';
const CACHE = 'koryosan-static-v10';
const ASSETS = [
  './','./index.html','./manifest.webmanifest',
  './styles.css?v=10','./firebase-auth.css?v=10','./firebase-config.js?v=10','./cloud-model.js?v=10','./firebase-client.js?v=10','./songs.js?v=10','./details.js?v=10','./metronome.js?v=10','./app.js?v=10',
  './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'
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
