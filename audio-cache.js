/* Best-effort 72h audio cache. CORS is a prerequisite for Drive downloads. */
(function(g){
  const DATABASE='koryosan-audio-v1',STORE='files',MAX_AGE=72*60*60*1000,MAX_BYTES=55*1024*1024;
  let dbPromise;
  function db(){
    if(!('indexedDB' in g))return Promise.reject(Error('No IndexedDB'));
    return dbPromise||(dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DATABASE,1);
      req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    }));
  }
  async function get(id){
    const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(STORE,'readonly').objectStore(STORE).get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});
  }
  async function put(record){
    const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(STORE,'readwrite').objectStore(STORE).put(record);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});
  }
  async function remove(id){
    const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(STORE,'readwrite').objectStore(STORE).delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});
  }
  async function cachedUrl(id){
    try{const entry=await get(id);if(!entry)return null;
      if(Date.now()-entry.at>MAX_AGE){await remove(id);return null;}
      if(!entry.blob||entry.blob.size===0)return null;
      return URL.createObjectURL(entry.blob);
    }catch(error){console.warn('音声キャッシュ読込:',error);return null;}
  }
  const attempted=new Set();
  async function saveFromDrive(id){
    if(!/^[\w-]{15,}$/.test(id)||attempted.has(id))return false;
    attempted.add(id);
    try{
      const response=await fetch(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,{mode:'cors',credentials:'omit'});
      if(!response.ok || response.type==='opaque')return false;
      const mime=(response.headers.get('content-type')||'').toLowerCase();
      if(!(mime.startsWith('audio/')||mime==='application/octet-stream'))return false;
      if(Number(response.headers.get('content-length')||0)>MAX_BYTES)return false;
      const blob=await response.blob();if(blob.size<100||blob.size>MAX_BYTES)return false;
      await put({id,at:Date.now(),blob});return true;
    }catch(error){console.info('Drive音声はブラウザからキャッシュできません:',error?.message);return false;}
  }
  g.KoryoAudio={cachedUrl,saveFromDrive};
})(window);
