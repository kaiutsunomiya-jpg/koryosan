'use strict';
/* 校了さん v13：さいわいさんの小節指定プレーヤーを青系の校了さんUIに移植。
 * 青い窓の小節・拍子・構成の位置は添付MIDI由来。各R2音声は認証取得後に端末で再生。
 */
(function(g){
  const modal=document.getElementById('modal-root');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const format=t=>{const seconds=Number(t);const n=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
  let current=null;
  function barForTime(bars,time){let lo=0,hi=bars.length-1;while(lo<=hi){const mid=(lo+hi)>>1;if(bars[mid].time<=time)lo=mid+1;else hi=mid-1;}return bars[Math.max(hi,0)]||null;}
  function stop(){if(current){current.close();current=null;}}
  function open({song,sections=[],edits={}}){
    stop();
    const isBlue=song.id==='ky-05';
    const ctx={alive:true,files:[],map:null,objectUrl:null,audio:null,offset:0,sections,edits,file:null,animation:0};
    ctx.close=()=>{ctx.alive=false;if(ctx.keyHandler)g.removeEventListener('keydown',ctx.keyHandler);cancelAnimationFrame(ctx.animation);if(ctx.audio){ctx.audio.pause();ctx.audio.removeAttribute('src');ctx.audio.load();}if(ctx.objectUrl)URL.revokeObjectURL(ctx.objectUrl);modal.replaceChildren();document.body.classList.remove('k13-modal-open');};
    current=ctx;
    modal.innerHTML=`<div class="k13-overlay" data-k13="backdrop"><section class="k13-dialog" role="dialog" aria-modal="true" aria-label="${esc(song.title)}の音声再生">
      <header class="k13-dialog-head"><div><h2>${esc(song.title)}</h2><span>${isBlue?'MIDI小節指定プレーヤー':'音源プレーヤー'}</span></div><button type="button" class="k13-close" data-k13="close" aria-label="閉じる">×</button></header>
      <div class="k13-body">
        <label class="k13-file-row"><span>音源ファイル</span><select id="k13-files" aria-label="再生する音声ファイル"><option value="">読み込み中…</option></select><button type="button" data-k13="refresh" aria-label="音源一覧を更新">↻</button></label>
        <p id="k13-server-status" class="k13-status" role="status">Firebaseログインを確認しています…</p>
        <div class="k13-player" hidden>
          <audio id="k13-audio" preload="metadata"></audio>
          <div class="k13-audio-row"><button type="button" class="k13-play" data-k13="toggle" aria-label="再生">▶</button><div class="k13-audio-time"><input id="k13-time" type="range" min="0" max="225" step="0.01" value="0" aria-label="再生位置"><div class="k13-timestamps"><span id="k13-elapsed">00:00</span><span id="k13-duration">--:--</span></div></div></div>
          <div id="k13-bars" ${isBlue?'':'hidden'}>
            <div class="k13-bar-stats"><div>現在 <strong id="k13-current-bar">001</strong> <small id="k13-bar-total"></small></div><label><input type="checkbox" id="k13-follow" checked> 構成に追従</label></div>
            <input type="range" id="k13-bar-slider" min="1" max="1" step="1" value="1" aria-label="小節を選択">
            <div class="k13-bar-ends"><span>001</span><span id="k13-last-bar"></span></div>
            <div class="k13-jump-row"><div class="k13-jumps"><button type="button" data-k13="jump" data-step="-4">−4</button><button type="button" data-k13="jump" data-step="-1">−1</button><button type="button" data-k13="jump" data-step="1">＋1</button><button type="button" data-k13="jump" data-step="4">＋4</button></div><div class="k13-go"><label for="k13-bar-num">小節</label><input type="number" id="k13-bar-num" inputmode="numeric" min="1" max="1"><button type="button" data-k13="go">ここから再生</button></div></div>
            <div class="k13-adjust"><label><input id="k13-lead" type="checkbox" checked> 指定小節の0.5秒前から</label><label>音源の開始ずれ <input id="k13-offset" type="number" inputmode="decimal" min="-60" max="60" step="0.1" value="0"> 秒</label></div>
            <p class="k13-caveat">小節位置は青い窓の添付MIDI（200 BPM／拍子変更を含む）に基づきます。別テイクや曲頭の無音がある音源は一致しない場合があります。</p>
          </div>
        </div>
        <section class="k13-sections" id="k13-sections" ${isBlue?'':'hidden'}><header><span>MIDIの構成</span><span>構成・歌詞／追記メモ</span></header><div id="k13-section-rows"></div></section>
      </div>
    </section></div>`;
    document.body.classList.add('k13-modal-open');
    const $=s=>modal.querySelector(s);
    const audio=$('#k13-audio');ctx.audio=audio;
    const files=$('#k13-files');const status=$('#k13-server-status');const view=$('.k13-player');
    const timeSlider=$('#k13-time'),barSlider=$('#k13-bar-slider'),barNum=$('#k13-bar-num');
    let loadingSerial=0,draggingTime=false,draggingBars=false,lastMarker=-1;
    const setStatus=text=>{if(ctx.alive)status.textContent=text;};
    const getOffset=()=>Number(ctx.offset)||0;
    const currentMapTime=()=>Math.max(0,(audio.currentTime||0)-getOffset());
    const update=()=>{
      if(!ctx.alive)return;
      if(!draggingTime) {timeSlider.value=String(audio.currentTime||0);$('#k13-elapsed').textContent=format(audio.currentTime);}
      $('.k13-play').textContent=audio.paused?'▶':'❚❚';
      if(ctx.map){
        const bars=ctx.map.bars;
        const bar=barForTime(bars,currentMapTime());
        if(bar){$('#k13-current-bar').textContent=String(bar.bar).padStart(3,'0');if(!draggingBars)barSlider.value=String(bar.bar);}
        const idx=ctx.map.markers.reduce((last,mark,i)=>mark.time<=currentMapTime()?i:last,-1);
        if(idx!==lastMarker){lastMarker=idx;modal.querySelectorAll('[data-k13-marker]').forEach(row=>row.classList.toggle('active',Number(row.dataset.k13Marker)===idx));if($('#k13-follow')?.checked&&!audio.paused&&idx>=0){const target=$(`[data-k13-marker="${idx}"]`);if(target){const box=target.getBoundingClientRect();if(box.top<210||box.bottom>window.innerHeight-24)target.scrollIntoView({block:'center',behavior:'smooth'});}}}
      }
      if(!audio.paused)ctx.animation=requestAnimationFrame(update);
    };
    function seekTo(seconds,play=false){
      if(!audio.src)return;
      const max=Number.isFinite(audio.duration)?audio.duration:999999;
      audio.currentTime=Math.max(0,Math.min(seconds,Math.max(0,max-0.025)));
      if(play)void audio.play().catch(()=>setStatus('自動再生できませんでした。▶を押してください。'));
      update();
    }
    function seekBar(bar,play=true){
      if(!ctx.map)return;
      const n=Math.max(1,Math.min(ctx.map.bars.length,Math.trunc(Number(bar)||1)));
      barNum.value=String(n);barSlider.value=String(n);
      seekTo(ctx.map.bars[n-1].time+getOffset()-($('#k13-lead').checked?0.5:0),play);
    }
    function drawMarkers(){
      if(!ctx.map)return;
      const entries=ctx.map.markers;
      const clean=s=>String(s||'').replace(/[【】]/g,'').replace(/[’']/g,"'").trim();
      const extras=ctx.edits;
      const col=extras?.columns?.length?0:-1;
      $('#k13-section-rows').innerHTML=entries.map((mark,i)=>{
        const idx=ctx.sections.findIndex(sec=>clean(sec.section)===clean(mark.section));
        const sec=idx>=0?ctx.sections[idx]:null;
        const note=idx>=0 && col>=0?extras.cells?.[idx]?.[col]||'':'';
        const text=sec?.lyrics||'';
        const content=[text,note?`【追記】\n${note}`:''].filter(Boolean).join('\n\n');
        return `<div class="k13-section-row" data-k13-marker="${i}"><div><button type="button" data-k13="marker" data-bar="${mark.bar}">${esc(mark.section)}</button><small>${String(mark.bar).padStart(3,'0')}小節 · ${format(mark.time)}</small></div><div>${content?esc(content):'<span class="k13-empty">—</span>'}</div></div>`;
      }).join('');
      $('#k13-bar-total').textContent=`/ ${ctx.map.totalMappedBars} 小節`;
      $('#k13-last-bar').textContent=String(ctx.map.totalMappedBars).padStart(3,'0');
      barSlider.max=String(ctx.map.totalMappedBars);barNum.max=String(ctx.map.totalMappedBars);
    }
    async function refresh(){
      setStatus('音源一覧を読み込んでいます…');
      try{
        const found=await g.KoryoR2Audio.list(song.id);if(!ctx.alive)return;
        ctx.files=found;
        files.innerHTML=found.length?found.map((f,i)=>`<option value="${i}">${esc(f.name)}（${(f.size/1024/1024).toFixed(1)} MB）</option>`).join(''):'<option value="">音源がありません</option>';
        if(!found.length){view.hidden=true;setStatus('R2に音源がありません。Google Drive同期を確認してください。');return;}
        setStatus(`${found.length}件の音源を取得しました。再生するファイルを選んでください。`);
        await choose(0);
      }catch(error){setStatus(error.message||'音源一覧を取得できませんでした。');}
    }
    async function choose(index){
      const n=++loadingSerial, file=ctx.files[index];if(!file)return;
      ctx.file=file;files.value=String(index);
      audio.pause();audio.removeAttribute('src');audio.load();
      if(ctx.objectUrl){URL.revokeObjectURL(ctx.objectUrl);ctx.objectUrl=null;}
      view.hidden=true;setStatus('ファイルを開いています…');
      try{
        const result=await g.KoryoR2Audio.load(file,setStatus);
        if(!ctx.alive||n!==loadingSerial){URL.revokeObjectURL(result.url);return;}
        ctx.objectUrl=result.url;audio.src=result.url;audio.load();view.hidden=false;
        timeSlider.value='0';$('#k13-elapsed').textContent='00:00';
        if(ctx.map){try{const saved=Number(localStorage.getItem('koryosan.bar-offset.'+file.key)||'0');if(Number.isFinite(saved)&&Math.abs(saved)<=60){ctx.offset=saved;$('#k13-offset').value=String(saved);}}catch{}}
      }catch(error){setStatus(error.message||'音声を読み込めませんでした。');}
    }
    audio.addEventListener('loadedmetadata',()=>{const duration=Number.isFinite(audio.duration)?audio.duration:song.durationSeconds;timeSlider.max=String(duration);$('#k13-duration').textContent=format(duration);update();});
    audio.addEventListener('play',update);audio.addEventListener('pause',update);audio.addEventListener('timeupdate',()=>{if(audio.paused)update();});
    audio.addEventListener('error',()=>setStatus('音声形式を再生できません。別のMP3/WAVを選択してください。'));
    modal.addEventListener('click',function click(event){
      if(!ctx.alive)return;
      const btn=event.target.closest('[data-k13]');if(!btn)return;
      const act=btn.dataset.k13;
      if(act==='backdrop'&&event.target!==btn)return;
      if(act==='close'||act==='backdrop'){stop();return;}
      if(act==='refresh'){void refresh();return;}
      if(act==='toggle'){if(audio.paused){void audio.play().catch(()=>setStatus('再生できません。もう一度再生を押してください。'));}else audio.pause();return;}
      if(act==='jump'){const now=barForTime(ctx.map?.bars||[],currentMapTime())?.bar||1;seekBar(now+Number(btn.dataset.step));return;}
      if(act==='go'){seekBar(barNum.value);return;}
      if(act==='marker'){seekBar(btn.dataset.bar);return;}
    });
    files.addEventListener('change',()=>void choose(Number(files.value)));
    timeSlider.addEventListener('input',()=>{draggingTime=true;$('#k13-elapsed').textContent=format(timeSlider.value);});
    timeSlider.addEventListener('change',()=>{draggingTime=false;seekTo(Number(timeSlider.value));});
    barSlider.addEventListener('input',()=>{draggingBars=true;$('#k13-current-bar').textContent=String(barSlider.value).padStart(3,'0');barNum.value=barSlider.value;});
    barSlider.addEventListener('change',()=>{draggingBars=false;seekBar(barSlider.value);});
    barNum.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();seekBar(barNum.value);}});
    $('#k13-offset').addEventListener('change',e=>{const v=Number(e.target.value);if(!Number.isFinite(v)||Math.abs(v)>60){e.target.value=String(ctx.offset);return;}ctx.offset=v;try{localStorage.setItem('koryosan.bar-offset.'+(ctx.file?.key||'ky-05'),String(v));}catch{}update();});
    const onKey=e=>{if(e.key==='Escape'){g.removeEventListener('keydown',onKey);stop();}};
    ctx.keyHandler=onKey;g.addEventListener('keydown',onKey);
    if(isBlue){fetch('./aoi_mado_bar_map.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(map=>{if(!ctx.alive)return;ctx.map=map;drawMarkers();}).catch(()=>{setStatus('小節マップを読み込めませんでした。');});}
    void refresh();
  }
  g.KoryoR2Player={open,close:stop};
})(window);
