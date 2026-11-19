'use strict';
/* 持ち曲は固定の8曲。名称・チューニング・Capo・演奏時間・BPMはユーザー指定の値を採用。 */
const KORYOSAN_SONGS = Object.freeze([
  {id:'ky-01', title:'総画俟つ廬',         tuning:'DADGAD',    capo:5,    durationSeconds:222, bpm:172},
  {id:'ky-02', title:'ヒートストア',       tuning:'レギュラー', capo:1,    durationSeconds:230, bpm:132},
  {id:'ky-03', title:'化学と巡回と',       tuning:'レギュラー', capo:4,    durationSeconds:290, bpm:80},
  {id:'ky-04', title:'カルーシュスカヤ',   tuning:'レギュラー', capo:null, durationSeconds:300, bpm:132},
  {id:'ky-05', title:'青い窓',             tuning:'DADGAD',    capo:4,    durationSeconds:225, bpm:200},
  {id:'ky-06', title:'理状的告発',         tuning:'DADGAD',    capo:null, durationSeconds:266, bpm:132},
  {id:'ky-07', title:'翡翠',               tuning:'レギュラー', capo:null, durationSeconds:234, bpm:120},
  {id:'ky-08', title:'レペゼン地球',       tuning:'DADGAD',    capo:2,    durationSeconds:310, bpm:120}
]);
const KORYOSAN_TUNINGS = Object.freeze(['レギュラー','DADGAD']);
/* 元のセットリスト作成機能にあった非楽曲項目を引き継ぎます（持ち曲8曲には含めません）。 */
const KORYOSAN_EXTRA = Object.freeze([
  {id:'ky-extra-tune',title:'-----tuning-----',tuning:'',capo:null,durationSeconds:30,bpm:null},
  {id:'ky-extra-mc',title:'-----MC-----',tuning:'',capo:null,durationSeconds:90,bpm:null},
  {id:'ky-extra-shortmc',title:'-----ミニMC-----',tuning:'',capo:null,durationSeconds:30,bpm:null},
  {id:'ky-extra-intro',title:'（イントロ追加）',tuning:'',capo:null,durationSeconds:30,bpm:null}
]);
const KORYOSAN_PRACTICE = Object.freeze([
  {id:'prep',title:'準備',minutes:20},{id:'run',title:'通し',minutes:30},
  {id:'section',title:'セクション',minutes:25},{id:'buffer',title:'バッファ',minutes:10},
  {id:'break',title:'休憩',minutes:10},{id:'cleanup',title:'片付け',minutes:10}
]);
