'use strict';
/* 校了さん v13: Firebase member-only private R2 audio API + 72-hour device cache */
(function(g){
  const BASE='https://koryosan-drive-sync.harikoryoband.workers.dev';
  const DATABASE='koryosan-r2-audio-cache-v1',STORE='media';
  const MAX_AGE=72*60*60*1000;
  const MAX_CACHE_BYTES=80*1024*1024;
  let dbPromise=null;
  function db(){
    if(!('indexedDB' in g))return Promise.reject(Error('No IndexedDB'));
    if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DATABASE,1);
      req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
    return dbPromise;
  }
  async function read(id){const d=await db();return new Promise((ok,fail)=>{const r=d.transaction(STORE,'readonly').objectStore(STORE).get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);});}
  async function save(value){const d=await db();return new Promise((ok,fail)=>{const r=d.transaction(STORE,'readwrite').objectStore(STORE).put(value);r.onsuccess=()=>ok(true);r.onerror=()=>fail(r.error);});}
  async function drop(id){const d=await db();return new Promise((ok,fail)=>{const r=d.transaction(STORE,'readwrite').objectStore(STORE).delete(id);r.onsuccess=()=>ok(true);r.onerror=()=>fail(r.error);});}
  async function request(path,opts={}) {
    const getToken=g.KoryoCloud?.getAudioToken;
    if(typeof getToken!=='function')throw Error('Firebaseへのログインが必要です。');
    const token=await getToken();
    const res=await fetch(BASE+path,{...opts,headers:{'Authorization':'Bearer '+token},cache:'no-store',credentials:'omit'});
    if(res.status===401||res.status===403)throw Error('音声へのアクセス権限がありません。Firebaseのログインとメンバー登録を確認してください。');
    if(!res.ok)throw Error(`音声サーバーとの通信に失敗しました（HTTP ${res.status}）。`);
    return res;
  }
  async function list(songId){
    const res=await request(`/api/audio/list?songId=${encodeURIComponent(songId)}`);
    const out=await res.json();return Array.isArray(out.files)?out.files:[];
  }
  function cacheId(file){
    const uid=g.KoryoCloud?.getAudioUid?.()||'anonymous';
    return [uid,file.key,file.etag||file.uploaded||''].join('|');
  }
  async function load(file,onStatus){
    const id=cacheId(file);let cached=null;
    try{cached=await read(id);}catch(e){console.info('Device audio cache unavailable:',e?.message);}
    if(cached?.blob?.size && Date.now()-cached.savedAt<MAX_AGE){
      onStatus?.('端末内キャッシュから読み込みました（最大72時間）');
      return {url:URL.createObjectURL(cached.blob),fromCache:true,revoke:true};
    }
    if(cached){try{await drop(id);}catch{}}
    onStatus?.('R2から音声を取得しています…');
    const res=await request('/api/audio/file?key='+encodeURIComponent(file.key));
    const blob=await res.blob();
    if(blob.size<1)throw Error('音声データが空です。');
    if(blob.size<=MAX_CACHE_BYTES){
      try{await save({id,blob,savedAt:Date.now()});onStatus?.('取得しました。72時間の端末キャッシュを保存しました。');}
      catch(e){onStatus?.('取得しました（端末の空き容量不足などでキャッシュは保存されませんでした）。');}
    }else onStatus?.('取得しました（80MB超のため端末キャッシュ対象外）。');
    return {url:URL.createObjectURL(blob),fromCache:false,revoke:true};
  }
  g.KoryoR2Audio={list,load,MAX_AGE};
})(window);
