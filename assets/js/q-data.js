/**
 * quest-data.js
 * Central data store — แก้ไขได้จาก Admin Panel
 * Rank thresholds (per-menu EXP):
 *   bronze   10–50
 *   silver   50–100
 *   gold    100–200
 *   platinum 200–500
 *   diamond  500–1000
 *   master  1000–2000
 */
 
const RANK_CONFIG = [
  { rank: 'bronze',   min: 10,   max: 50,   label: 'BRONZE',   color: '#cd7f32' },
  { rank: 'silver',   min: 50,   max: 100,  label: 'SILVER',   color: '#a0a0a0' },
  { rank: 'gold',     min: 100,  max: 200,  label: 'GOLD',     color: '#f0c040' },
  { rank: 'platinum', min: 200,  max: 500,  label: 'PLATINUM', color: '#74b0d4' },
  { rank: 'diamond',  min: 500,  max: 1000, label: 'DIAMOND',  color: '#b9f2ff' },
  { rank: 'master',   min: 1000, max: 2000, label: 'MASTER',   color: '#ff6b6b' },
];
 
/** ระดับ rank ของผู้เล่นปัจจุบัน (mock — ในระบบจริงดึงจาก auth/session) */
const PLAYER_RANK_ORDER = ['bronze','silver','gold','platinum','diamond','master'];
 
function getRankByExp(exp) {
  for (const r of RANK_CONFIG) {
    if (exp >= r.min && exp < r.max) return r;
  }
  if (exp >= 1000) return RANK_CONFIG[5];
  return RANK_CONFIG[0];
}
 
function getRankIndex(rankName) {
  return PLAYER_RANK_ORDER.indexOf(rankName);
}
 
/* ================================================================
   DATABASE (แทน backend — admin แก้ไขได้ที่นี่หรือผ่าน admin.html)
   ================================================================ */
const DB = {
  /** rank ของผู้เล่นปัจจุบัน */
  playerRank: 'gold',
 
  /** หมวดหมู่ (categories) */
  categories: [
    {
      id: 'cat-steak',
      label: 'C',
      name: '4 จตุรเทพสเต็ก',
      visible: true,
      quests: [
        {
          id: 'q-steak1',
          name: 'สเต็กหมูย่างซอสพริกไทยดำ',
          image: '../../assets/img/steak1.png',
          time: 30,
          exp: 200,
          visible: true,
        },
        {
          id: 'q-steak2',
          name: 'สเต็กเนื้อริบอายซอสเห็ด',
          image: '../../assets/img/steak2.png',
          time: 60,
          exp: 500,
          visible: true,
        },
        {
          id: 'q-steak3',
          name: 'สเต็กเนื้อวากิวซอสไวน์แดง',
          image: '../../assets/img/steak3.png',
          time: 90,
          exp: 1200,
          visible: true,
        },
        {
          id: 'q-steak4',
          name: 'สเต็กไก่สมุนไพรพร้อมสลัด',
          image: '../../assets/img/steak4.png',
          time: 45,
          exp: 80,
          visible: true,
        },
      ],
    },
    {
      id: 'cat-stir',
      label: 'C',
      name: 'ผัดไทย & ผัดกระเพรา',
      visible: true,
      quests: [
        {
          id: 'q-stir1',
          name: 'ผัดกระเพราหมูสับไข่ดาว',
          image: '../../assets/img/steak1.png',
          time: 20,
          exp: 60,
          visible: true,
        },
        {
          id: 'q-stir2',
          name: 'ผัดไทยกุ้งสดโบราณ',
          image: '../../assets/img/steak2.png',
          time: 35,
          exp: 150,
          visible: true,
        },
      ],
    },
  ],
};
 
/* ===== helpers ===== */
function saveDB() {
  localStorage.setItem('cookquest_db', JSON.stringify(DB));
}
 
function loadDB() {
  const saved = localStorage.getItem('cookquest_db');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(DB, parsed);
    } catch(e) {}
  }
}
 
function isQuestLocked(questExp) {
  const questRank = getRankByExp(questExp);
  const playerIdx = getRankIndex(DB.playerRank);
  const questIdx  = getRankIndex(questRank.rank);
  return questIdx > playerIdx;
}
 
loadDB();