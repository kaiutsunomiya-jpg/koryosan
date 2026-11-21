/* Firebaseへの唯一の通信窓口。公開情報はfirebase-config.jsのみ。 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged,
  signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import { getDatabase, ref, get, set, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js';

const BAND='bands/koryosan';
const root=document.getElementById('app');
const overlay=document.getElementById('auth-screen');
const form=document.getElementById('login-form');
const message=document.getElementById('auth-message');
let auth=null,db=null,loaded=false, unsubscribers=[],session=0;
let lastRemote=null;

function showAuth(state,text=''){
  overlay.hidden=false;
  overlay.dataset.state=state;
  form.hidden=state!=='login';
  message.textContent=text;
  const spinner=overlay.querySelector('.auth-spinner');
  spinner.hidden=state==='login';
}
function clearSub(){for(const off of unsubscribers)off();unsubscribers=[];}
function forbidden(){showAuth('denied','このアカウントはメンバーとして登録されていません。管理者に確認してください。');}
function configValid(c){return !!(c&&c.apiKey&&!c.apiKey.startsWith('PASTE_')&&c.appId&&!c.appId.startsWith('PASTE_')&&c.projectId&&c.databaseURL&&/^https:\/\//.test(c.databaseURL));}
function showError(error){console.error(error);showAuth('error',error?.message||'Firebaseへの接続に失敗しました。');}

const config=window.KORYO_FIREBASE_CONFIG;
if(!configValid(config)){
  showAuth('setup','firebase-config.js にFirebase ConsoleのWebアプリ設定を入力してください。READMEをご確認ください。');
}else{
  try{
    const firebaseApp=initializeApp(config);
    auth=getAuth(firebaseApp);
    db=getDatabase(firebaseApp);
    await setPersistence(auth,browserLocalPersistence);
    onAuthStateChanged(auth, async user=>{
      const my=++session;
      clearSub();lastRemote=null;
      if(!user){
        if(loaded){location.reload();return;}
        root.replaceChildren();showAuth('login','');return;
      }
      showAuth('checking','メンバー資格を確認しています…');
      try{
        // 公開画面に入る前に必ずサーバー側のUID許可リストを確認する。
        const memberSnap=await get(ref(db,`members/${user.uid}`));
        if(my!==session)return;
        if(memberSnap.val()!==true){if(loaded){location.reload();return;}forbidden();return;}
        showAuth('loading','共有データを読み込んでいます…');
        // 最初に共有データを取得。初期例は新しいノードが未登録の場合のみ1回作成。
        const snap=await get(ref(db,BAND));
        if(my!==session)return;
        let data=snap.val();
        if(data && (!data.schedules || !data.meetings)){
          // runTransactionで他メンバーの既存データを上書きしない。
          await seedNewBranches(data);
          if(my!==session)return;
          const fresh=await get(ref(db,BAND));
          if(my!==session)return;
          data=fresh.val();
        }
        if(!data?.songs || !data?.songSections){throw Error('Firebaseに曲・歌詞の初期JSONがありません。インポート先 /bands/koryosan を確認してください。');}
        lastRemote=data;
        installDefinitions(data);
        const converted=window.KoryoCloudModel.convert(data);
        window.__KORYO_INITIAL_STATE=converted.state;
        if(!loaded){
          await loadApp();loaded=true;
        }
        overlay.hidden=true;
        beginWatch(my);
      }catch(error){if(my===session)showError(error);}
    },error=>showError(error));
  }catch(error){showError(error);}
}

async function seedNewBranches(existing){
  const samples={
    schedules:{'demo-2026-12-17':{category:'practice',date:'2026-12-17',start:'19:00',end:'22:00',place:'新宿NOAH',notes:'・繋ぎとかの練習\n・セトリ通し',createdAt:0},'demo-2026-12-22':{category:'practice',date:'2026-12-22',start:'19:00',end:'22:00',place:'渋谷ペンタシティサイド',notes:'・セトリ集中通し',createdAt:0}},
    meetings:{'demo-art-photo':{title:'アー写真',createdAt:0,rows:{'demo-n1':{text:'真夏でオワってますが7月末、8月付近に撮れると告知的にベスト、暑さマシな夜とかでもいい',order:0},'demo-n2':{text:'あまりカッコつけすぎると締まった感じにするの難しそうなので、ラフ目な雰囲気でも良い気がしてる',order:1},'demo-n3':{text:'🟢8/16府中で撮影の結論',order:2}}}}
  };
  for(const [branch,data] of Object.entries(samples)){
    if(existing?.[branch]!=null)continue;
    try{await runTransaction(ref(db,`${BAND}/${branch}`),current=>current===null?data:undefined,{applyLocally:false});}
    catch(e){console.warn(`初期例 ${branch} は未登録です。Firebaseルールを確認してください。`,e);}
  }
}
function installDefinitions(data){
  const mapped=window.KoryoCloudModel.convert(data);
  window.KORYOSAN_SONGS=mapped.songs;
  window.KORYOSAN_DETAILS=mapped.details;
  window.KORYOSAN_EXTRA=mapped.extras;
  window.KORYOSAN_PRACTICE=mapped.practice;
}
function loadApp(){
  return new Promise((resolve,reject)=>{
    const src=document.createElement('script');
    src.src='./app.js?v=11';src.onload=resolve;src.onerror=()=>reject(Error('アプリの読み込みに失敗しました。'));
    document.body.append(src);
  });
}
function beginWatch(my){
  const branches=['songs','songSections','setlistExtras','practicePresets','tasks','songNotes','practiceSlots','setlistSlots','schedules','availability','meetings','accounting'];
  for(const branch of branches){
    const off=onValue(ref(db,`${BAND}/${branch}`),snap=>{
      if(my!==session || !lastRemote)return;
      lastRemote={...lastRemote,[branch]:snap.val()};
      const converted=window.KoryoCloudModel.convert(lastRemote);
      if(['songs','songSections','setlistExtras','practicePresets'].includes(branch))installDefinitions(lastRemote);
      window.KoryoApp?.receiveRemote?.(branch,converted);
    },error=>{
      console.error(`Realtime DB ${branch}:`,error);
      window.KoryoApp?.syncError?.('共有データの受信に失敗しました。ネット接続と権限を確認してください。');
    });
    unsubscribers.push(off);
  }
}
// UIからの単一フィールド更新。異なるタスクやセルを丸ごと上書きしない。
async function publish(before,after){
  if(!auth?.currentUser||!db)throw Error('未ログインです。');
  const changes=window.KoryoCloudModel.diff(before,after);
  if(!changes.length)return;
  const outcome=await Promise.allSettled(changes.map(change=>set(ref(db,`${BAND}/${change.path}`),change.value)));
  const errors=outcome.filter(x=>x.status==='rejected');
  if(errors.length)throw Error(`${errors.length}件の保存に失敗しました。ネット接続またはアクセス権を確認してください。`);
}
async function logout(){clearSub();if(!auth)return;await signOut(auth);location.reload();}
window.KoryoCloud={publish,logout};
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!auth)return;
  const button=form.querySelector('button[type="submit"]');
  const email=String(form.elements.email.value||'').trim(),pwd=String(form.elements.password.value||'');
  if(!email||!pwd)return;
  button.disabled=true;message.textContent='確認しています…';
  try{await signInWithEmailAndPassword(auth,email,pwd);form.elements.password.value='';}
  catch(error){
    const code=error.code||'';
    message.textContent=code==='auth/invalid-credential'||code==='auth/wrong-password'||code==='auth/user-not-found'?'メールアドレスまたはパスワードをご確認ください。':code==='auth/too-many-requests'?'試行回数が多すぎます。時間をおいてください。':'ログインできませんでした。通信環境をご確認ください。';
  }finally{button.disabled=false;}
});
overlay.addEventListener('click',async event=>{
  if(event.target.closest('[data-auth-action="logout"]')){
    try{await logout();}catch(e){showError(e);}
  }
});
