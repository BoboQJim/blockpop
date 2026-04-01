/* BlockPop Service Worker v2 */
const CACHE_NAME='blockpop-v2';
const ASSETS=['./','./index.html','./style.css','./game.js','./manifest.json',
  './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE_NAME).then(function(c){return c.addAll(ASSETS)}));
  self.skipWaiting();
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(n){return Promise.all(n.filter(function(k){return k!==CACHE_NAME}).map(function(k){return caches.delete(k)}))}));
  self.clients.claim();
});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);
  if(url.origin===self.location.origin){
    e.respondWith(caches.match(e.request).then(function(c){
      if(c)return c;
      return fetch(e.request).then(function(r){if(r&&r.status===200){var cl=r.clone();caches.open(CACHE_NAME).then(function(ca){ca.put(e.request,cl)})}return r});
    }).catch(function(){if(e.request.destination==='document')return caches.match('./index.html')}));
  }else{
    e.respondWith(fetch(e.request).then(function(r){if(r&&r.status===200){var cl=r.clone();caches.open(CACHE_NAME).then(function(ca){ca.put(e.request,cl)})}return r}).catch(function(){return caches.match(e.request)}));
  }
});
