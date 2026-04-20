import { useState, useEffect, useMemo, useRef } from "react";
import { supabase, hasSupabase } from "./supabase.js";
import { dbLoad, dbSave, dbDelete, getDbStatus } from "./db.js";

/* ═══ KONSTANTY ═══ */
const STATUSES = {
  draft: { label: "Návrh", color: "#60a5fa", draft: true },
  confirmed: { label: "Potvrzeno", color: "#2563eb", draft: false },
};
const SK = ["draft", "confirmed"];
const TYPES = ["PP/PP", "PP/PAP", "MRAMOR"];
const WIDTHS = [50, 75, 80];
const MACHINES = {
  BDM_MRAMOR: { label: "BDM MRAMOR", color: "#c2410c", phase: 1 },
  BDM_PP: { label: "BDM PP", color: "#1d4ed8", phase: 1 },
  AP1: { label: "AP-1", color: "#7e22ce", phase: 2 },
  CENTRA: { label: "CENTRA", color: "#be123c", phase: 3 },
  HANG: { label: "HANG", color: "#15803d", phase: 4 },
};
const MK = Object.keys(MACHINES);
const BDM_KEYS = ["BDM_MRAMOR", "BDM_PP"];
const SHIFT_OPTS = [0, 8, 12, 16, 24];
const DEF = {
  norms: {
    BDM_MRAMOR: {"MRAMOR":2000,"PP/PAP":1500,"PP/PP":1500},
    BDM_PP: {"PP/PAP":1000,"PP/PP":1000},
    AP1: 1800, CENTRA: 800, HANG: 1600
  },
  shifts: { BDM_MRAMOR: { weekday: 24, weekend: 0, start: "06:00" }, BDM_PP: { weekday: 24, weekend: 0, start: "06:00" }, AP1: { weekday: 16, weekend: 0, start: "06:00" }, CENTRA: { weekday: 16, weekend: 0, start: "06:00" }, HANG: { weekday: 16, weekend: 0, start: "06:00" } },
  shiftOverrides: {},
};

/* ═══ VZOROVÁ DATA (54 zakázek) ═══ */
const SAMPLE=[{"id":"0000","customer":"Thomas Philipps","expL":"26-00489","type":"PP/PAP","width":80,"qty":10560,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-04-20","notes":"","novinka":false,"stitek":true,"vpPolep":true,"etiketa":true,"etiketaHang":false,"seq":0,"lock":false,"ps":"","seqAP1":0,"lockAP1":false,"psAP1":"","seqCEN":0,"lockCEN":false,"psCEN":"","seqHANG":0,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0001","customer":"NETUNO","expL":"26-00541","type":"PP/PAP","width":80,"qty":8640,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-04-21","notes":"","novinka":false,"stitek":true,"vpPolep":true,"etiketa":true,"etiketaHang":false,"seq":1,"lock":false,"ps":"","seqAP1":1,"lockAP1":false,"psAP1":"","seqCEN":1,"lockCEN":false,"psCEN":"","seqHANG":1,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0002","customer":"NETUNO","expL":"26-00541","type":"MRAMOR","width":75,"qty":2880,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-04-21","notes":"","novinka":false,"stitek":true,"vpPolep":true,"etiketa":true,"etiketaHang":false,"seq":2,"lock":false,"ps":"","seqAP1":2,"lockAP1":false,"psAP1":"","seqCEN":2,"lockCEN":false,"psCEN":"","seqHANG":2,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0003","customer":"NETUNO modrá modrá","expL":"26-00541","type":"MRAMOR","width":80,"qty":960,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-04-21","notes":"","novinka":false,"stitek":true,"vpPolep":true,"etiketa":true,"etiketaHang":false,"seq":3,"lock":false,"ps":"","seqAP1":3,"lockAP1":false,"psAP1":"","seqCEN":3,"lockCEN":false,"psCEN":"","seqHANG":3,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0005","customer":"Woolworth","expL":"26-00285","type":"MRAMOR","width":50,"qty":19800,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-04-27","notes":"","novinka":false,"stitek":true,"vpPolep":true,"etiketa":true,"etiketaHang":false,"seq":4,"lock":false,"ps":"","seqAP1":4,"lockAP1":false,"psAP1":"","seqCEN":4,"lockCEN":false,"psCEN":"","seqHANG":4,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0014","customer":"Thomas Philipps","expL":"26-00319","type":"MRAMOR","width":75,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-04","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":5,"lock":false,"ps":"","seqAP1":5,"lockAP1":false,"psAP1":"","seqCEN":5,"lockCEN":false,"psCEN":"","seqHANG":5,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0015","customer":"Soennecken","expL":"26-00382","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-04","notes":"","novinka":false,"stitek":true,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":6,"lock":false,"ps":"","seqAP1":6,"lockAP1":false,"psAP1":"","seqCEN":6,"lockCEN":false,"psCEN":"","seqHANG":6,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0012","customer":"Woolworth po 10ti","expL":"26-00430","type":"PP/PAP","width":50,"qty":9600,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-05","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":7,"lock":false,"ps":"","seqAP1":7,"lockAP1":false,"psAP1":"","seqCEN":7,"lockCEN":false,"psCEN":"","seqHANG":7,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0013","customer":"Woolworth po 10 ti","expL":"26-00430","type":"PP/PAP","width":80,"qty":8160,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-05","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":8,"lock":false,"ps":"","seqAP1":8,"lockAP1":false,"psAP1":"","seqCEN":8,"lockCEN":false,"psCEN":"","seqHANG":8,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0016","customer":"ACTIVA","expL":"26-00635","type":"MRAMOR","width":80,"qty":11040,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-06","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":9,"lock":false,"ps":"","seqAP1":9,"lockAP1":false,"psAP1":"","seqCEN":9,"lockCEN":false,"psCEN":"","seqHANG":9,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0017","customer":"ACTIVA","expL":"26-00635","type":"MRAMOR","width":50,"qty":6000,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-06","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":10,"lock":false,"ps":"","seqAP1":10,"lockAP1":false,"psAP1":"","seqCEN":10,"lockCEN":false,"psCEN":"","seqHANG":10,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0018","customer":"TEDi","expL":"26-00432","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-11","notes":"LEPENKA BUDE","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":11,"lock":false,"ps":"","seqAP1":11,"lockAP1":false,"psAP1":"","seqCEN":11,"lockCEN":false,"psCEN":"","seqHANG":11,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0019","customer":"TEDi","expL":"26-00433","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-11","notes":"LEPENKA BUDE","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":12,"lock":false,"ps":"","seqAP1":12,"lockAP1":false,"psAP1":"","seqCEN":12,"lockCEN":false,"psCEN":"","seqHANG":12,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0020","customer":"Woolworth 1,8 lep","expL":"25-00049","type":"MRAMOR","width":80,"qty":16000,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-11","notes":"perforované štítky Stenzer","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":13,"lock":false,"ps":"","seqAP1":13,"lockAP1":false,"psAP1":"","seqCEN":13,"lockCEN":false,"psCEN":"","seqHANG":13,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0021","customer":"Soennecken","expL":"26-00362","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-15","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":14,"lock":false,"ps":"","seqAP1":14,"lockAP1":false,"psAP1":"","seqCEN":14,"lockCEN":false,"psCEN":"","seqHANG":14,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0022","customer":"Woolworth mix přebal","expL":"26-00529","type":"PP/PAP","width":80,"qty":16000,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-18","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":15,"lock":false,"ps":"","seqAP1":15,"lockAP1":false,"psAP1":"","seqCEN":15,"lockCEN":false,"psCEN":"","seqHANG":15,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0023","customer":"Soennecken","expL":"26-00364","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-18","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":16,"lock":false,"ps":"","seqAP1":16,"lockAP1":false,"psAP1":"","seqCEN":16,"lockCEN":false,"psCEN":"","seqHANG":16,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0025","customer":"Soennecken","expL":"25-01824","type":"MRAMOR","width":50,"qty":19800,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-18","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":17,"lock":false,"ps":"","seqAP1":17,"lockAP1":false,"psAP1":"","seqCEN":17,"lockCEN":false,"psCEN":"","seqHANG":17,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0024","customer":"Stylex","expL":"26-00295","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-19","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":18,"lock":false,"ps":"","seqAP1":18,"lockAP1":false,"psAP1":"","seqCEN":18,"lockCEN":false,"psCEN":"","seqHANG":18,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0026","customer":"Soennecken","expL":"26-00363","type":"MRAMOR","width":50,"qty":19800,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-20","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":19,"lock":false,"ps":"","seqAP1":19,"lockAP1":false,"psAP1":"","seqCEN":19,"lockCEN":false,"psCEN":"","seqHANG":19,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0030","customer":"TEDi Stargard","expL":"26-00532","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-25","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":20,"lock":false,"ps":"","seqAP1":20,"lockAP1":false,"psAP1":"","seqCEN":20,"lockCEN":false,"psCEN":"","seqHANG":20,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0031","customer":"TEDi Dortmund","expL":"26-00533","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-05-25","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":21,"lock":false,"ps":"","seqAP1":21,"lockAP1":false,"psAP1":"","seqCEN":21,"lockCEN":false,"psCEN":"","seqHANG":21,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0038","customer":"TEDi Dortmund","expL":"26-00533","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-01","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":22,"lock":false,"ps":"","seqAP1":22,"lockAP1":false,"psAP1":"","seqCEN":22,"lockCEN":false,"psCEN":"","seqHANG":22,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0039","customer":"Soennecken","expL":"26-00366","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-01","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":23,"lock":false,"ps":"","seqAP1":23,"lockAP1":false,"psAP1":"","seqCEN":23,"lockCEN":false,"psCEN":"","seqHANG":23,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0040","customer":"Soennecken","expL":"26-00383","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-02","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":24,"lock":false,"ps":"","seqAP1":24,"lockAP1":false,"psAP1":"","seqCEN":24,"lockCEN":false,"psCEN":"","seqHANG":24,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0033","customer":"123inkt po 10ti","expL":"26-00622","type":"MRAMOR","width":80,"qty":5280,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-03","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":25,"lock":false,"ps":"","seqAP1":25,"lockAP1":false,"psAP1":"","seqCEN":25,"lockCEN":false,"psCEN":"","seqHANG":25,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0034","customer":"123inkt po 10ti","expL":"26-00622","type":"MRAMOR","width":50,"qty":2400,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-03","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":26,"lock":false,"ps":"","seqAP1":26,"lockAP1":false,"psAP1":"","seqCEN":26,"lockCEN":false,"psCEN":"","seqHANG":26,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0035","customer":"123inkt","expL":"26-00622","type":"PP/PAP","width":50,"qty":1800,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-03","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":27,"lock":false,"ps":"","seqAP1":27,"lockAP1":false,"psAP1":"","seqCEN":27,"lockCEN":false,"psCEN":"","seqHANG":27,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0037","customer":"123inkt","expL":"26-00622","type":"PP/PAP","width":80,"qty":7200,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-03","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":28,"lock":false,"ps":"","seqAP1":28,"lockAP1":false,"psAP1":"","seqCEN":28,"lockCEN":false,"psCEN":"","seqHANG":28,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0041","customer":"TEDi Stargard","expL":"26-00532","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-08","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":29,"lock":false,"ps":"","seqAP1":29,"lockAP1":false,"psAP1":"","seqCEN":29,"lockCEN":false,"psCEN":"","seqHANG":29,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0042","customer":"Soennecken","expL":"26-00367","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-08","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":30,"lock":false,"ps":"","seqAP1":30,"lockAP1":false,"psAP1":"","seqCEN":30,"lockCEN":false,"psCEN":"","seqHANG":30,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0043","customer":"Stylex","expL":"26-00296","type":"MRAMOR","width":50,"qty":19800,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-09","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":31,"lock":false,"ps":"","seqAP1":31,"lockAP1":false,"psAP1":"","seqCEN":31,"lockCEN":false,"psCEN":"","seqHANG":31,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0044","customer":"Woolworth","expL":"26-00427","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-10","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":32,"lock":false,"ps":"","seqAP1":32,"lockAP1":false,"psAP1":"","seqCEN":32,"lockCEN":false,"psCEN":"","seqHANG":32,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0045","customer":"TEDi Dortmund","expL":"26-00533","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-12","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":33,"lock":false,"ps":"","seqAP1":33,"lockAP1":false,"psAP1":"","seqCEN":33,"lockCEN":false,"psCEN":"","seqHANG":33,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0046","customer":"TEDi Dortmund","expL":"26-00533","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-15","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":34,"lock":false,"ps":"","seqAP1":34,"lockAP1":false,"psAP1":"","seqCEN":34,"lockCEN":false,"psCEN":"","seqHANG":34,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0049","customer":"Stylex","expL":"26-0297","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-16","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":35,"lock":false,"ps":"","seqAP1":35,"lockAP1":false,"psAP1":"","seqCEN":35,"lockCEN":false,"psCEN":"","seqHANG":35,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0047","customer":"Soennecken","expL":"26-00368","type":"MRAMOR","width":50,"qty":19800,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-17","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":36,"lock":false,"ps":"","seqAP1":36,"lockAP1":false,"psAP1":"","seqCEN":36,"lockCEN":false,"psCEN":"","seqHANG":36,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0048","customer":"Soennecken","expL":"26-00384","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-17","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":37,"lock":false,"ps":"","seqAP1":37,"lockAP1":false,"psAP1":"","seqCEN":37,"lockCEN":false,"psCEN":"","seqHANG":37,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0050","customer":"Soennecken","expL":"26-00369","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-22","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":38,"lock":false,"ps":"","seqAP1":38,"lockAP1":false,"psAP1":"","seqCEN":38,"lockCEN":false,"psCEN":"","seqHANG":38,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0051","customer":"Soennecken","expL":"26-00371","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-24","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":39,"lock":false,"ps":"","seqAP1":39,"lockAP1":false,"psAP1":"","seqCEN":39,"lockCEN":false,"psCEN":"","seqHANG":39,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0052","customer":"TEDi Dortmund","expL":"26-00533","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-26","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":40,"lock":false,"ps":"","seqAP1":40,"lockAP1":false,"psAP1":"","seqCEN":40,"lockCEN":false,"psCEN":"","seqHANG":40,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0053","customer":"TEDi Stargard","expL":"26-00532","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-29","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":41,"lock":false,"ps":"","seqAP1":41,"lockAP1":false,"psAP1":"","seqCEN":41,"lockCEN":false,"psCEN":"","seqHANG":41,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0054","customer":"Soennecken","expL":"26-00372","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-06-29","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":42,"lock":false,"ps":"","seqAP1":42,"lockAP1":false,"psAP1":"","seqCEN":42,"lockCEN":false,"psCEN":"","seqHANG":42,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0055","customer":"Woolworth","expL":"26-00428","type":"MRAMOR","width":50,"qty":19800,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-07-01","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":43,"lock":false,"ps":"","seqAP1":43,"lockAP1":false,"psAP1":"","seqCEN":43,"lockCEN":false,"psCEN":"","seqHANG":43,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0056","customer":"Woolworth","expL":"26-00429","type":"MRAMOR","width":80,"qty":15840,"status":"confirmed","machine":"BDM_MRAMOR","deadline":"2026-07-08","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":44,"lock":false,"ps":"","seqAP1":44,"lockAP1":false,"psAP1":"","seqCEN":44,"lockCEN":false,"psCEN":"","seqHANG":44,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0004","customer":"P75-2K0102R-M102","expL":"","type":"MRAMOR","width":75,"qty":400,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"","novinka":false,"stitek":true,"vpPolep":true,"etiketa":true,"etiketaHang":false,"seq":45,"lock":false,"ps":"","seqAP1":45,"lockAP1":false,"psAP1":"","seqCEN":45,"lockCEN":false,"psCEN":"","seqHANG":45,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0006","customer":"Woolworth po 10ti","expL":"26-00285","type":"PP/PAP","width":80,"qty":1440,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":true,"etiketaHang":false,"seq":46,"lock":false,"ps":"","seqAP1":46,"lockAP1":false,"psAP1":"","seqCEN":46,"lockCEN":false,"psCEN":"","seqHANG":46,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0007","customer":"Botcher bude duben","expL":"předpoklad","type":"MRAMOR","width":80,"qty":15840,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"","novinka":false,"stitek":true,"vpPolep":true,"etiketa":true,"etiketaHang":false,"seq":47,"lock":false,"ps":"","seqAP1":47,"lockAP1":false,"psAP1":"","seqCEN":47,"lockCEN":false,"psCEN":"","seqHANG":47,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0008","customer":"Botcher bude duben","expL":"předpoklad","type":"MRAMOR","width":80,"qty":15840,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"","novinka":false,"stitek":true,"vpPolep":true,"etiketa":false,"etiketaHang":false,"seq":48,"lock":false,"ps":"","seqAP1":48,"lockAP1":false,"psAP1":"","seqCEN":48,"lockCEN":false,"psCEN":"","seqHANG":48,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0009","customer":"Botcher bude duben","expL":"předpoklad","type":"MRAMOR","width":80,"qty":15840,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"","novinka":false,"stitek":true,"vpPolep":true,"etiketa":false,"etiketaHang":false,"seq":49,"lock":false,"ps":"","seqAP1":49,"lockAP1":false,"psAP1":"","seqCEN":49,"lockCEN":false,"psCEN":"","seqHANG":49,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0010","customer":"Botcher bude duben","expL":"předpoklad","type":"MRAMOR","width":80,"qty":15840,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"","novinka":false,"stitek":true,"vpPolep":true,"etiketa":false,"etiketaHang":false,"seq":50,"lock":false,"ps":"","seqAP1":50,"lockAP1":false,"psAP1":"","seqCEN":50,"lockCEN":false,"psCEN":"","seqHANG":50,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0011","customer":"Botcher NEHANGOVAT","expL":"předpoklad","type":"MRAMOR","width":80,"qty":15840,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"","novinka":false,"stitek":true,"vpPolep":true,"etiketa":false,"etiketaHang":false,"seq":51,"lock":false,"ps":"","seqAP1":51,"lockAP1":false,"psAP1":"","seqCEN":51,"lockCEN":false,"psCEN":"","seqHANG":51,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0027","customer":"Botcher bude duben","expL":"předpoklad","type":"MRAMOR","width":80,"qty":15840,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":52,"lock":false,"ps":"","seqAP1":52,"lockAP1":false,"psAP1":"","seqCEN":52,"lockCEN":false,"psCEN":"","seqHANG":52,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0028","customer":"Roy BUDE duben","expL":"PŘEDPOKLAD","type":"MRAMOR","width":80,"qty":16000,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":53,"lock":false,"ps":"","seqAP1":53,"lockAP1":false,"psAP1":"","seqCEN":53,"lockCEN":false,"psCEN":"","seqHANG":53,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0029","customer":"Plate BUDE květen","expL":"PŘEDPOKLAD","type":"MRAMOR","width":80,"qty":17000,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"štítky Rench","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":54,"lock":false,"ps":"","seqAP1":54,"lockAP1":false,"psAP1":"","seqCEN":54,"lockCEN":false,"psCEN":"","seqHANG":54,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0032","customer":"Staples MIX BUDE","expL":"PŘEDPOKLAD","type":"PP/PP","width":80,"qty":16000,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":55,"lock":false,"ps":"","seqAP1":55,"lockAP1":false,"psAP1":"","seqCEN":55,"lockCEN":false,"psCEN":"","seqHANG":55,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""},{"id":"0036","customer":"Lyreco BUDE","expL":"PŘEDPOKLAD","type":"PP/PAP","width":80,"qty":15000,"status":"draft","machine":"BDM_MRAMOR","deadline":"","notes":"","novinka":false,"stitek":false,"vpPolep":false,"etiketa":false,"etiketaHang":false,"seq":56,"lock":false,"ps":"","seqAP1":56,"lockAP1":false,"psAP1":"","seqCEN":56,"lockCEN":false,"psCEN":"","seqHANG":56,"lockHANG":false,"psHANG":"","actualQty":0,"actStartBDM":"","actStartAP1":"","actStartCEN":"","actStartHANG":"","actEndBDM":"","actEndAP1":"","actEndCEN":"","actEndHANG":""}];

/* ═══ HELPERS ═══ */
const uid = () => Math.random().toString(36).slice(2, 10);
const pf = (n) => (typeof n === "string" ? parseFloat(n) || 0 : n || 0);
const fmt = (n, d = 1) => Number(n).toFixed(d);
const fH = (h) => { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return `${hh}h${mm > 0 ? ` ${mm}m` : ""}`; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const isoD = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : "");
const czDT = (d) => { if (!d) return "—"; if (typeof d === "string") d = new Date(d); if (isNaN(d)) return "—"; return `${d.getDate()}.${d.getMonth() + 1}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const czD = (iso) => { if (!iso) return "—"; const d = new Date(iso); return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`; };
const pd = (s) => { if (!s) return null; if (s instanceof Date) return s; const d = new Date(s); return isNaN(d) ? null : d; };
const addH = (d, h) => new Date(d.getTime() + h * 36e5);
const addD = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const sod = (d) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
const isWE = (d) => { const x = d.getDay(); return x === 0 || x === 6; };

/* ═══ FLOW ═══ */
function getNorm(m, s, type) {
  const n = (s?.norms || DEF.norms)[m];
  if (typeof n === "object" && type) return pf(n[type]) || 100;
  return pf(n) || 100;
}
const needsCentra = (o) => o.type === "PP/PP" || o.type === "PP/PAP";
const autoAssignBDM = () => "BDM_MRAMOR"; // BDM_PP only if explicitly set
const bdmCompat = (m, t) => m === "BDM_MRAMOR" || (m === "BDM_PP" && t !== "MRAMOR");

/* ═══ CHANGEOVER (MAX princip) ═══ */
function getCO(machine, prev, next) {
  if (!prev || !next) return 0;
  const pT = typeof prev === "string" ? prev : prev.type, nT = typeof next === "string" ? next : next.type;
  const pW = typeof prev === "object" ? pf(prev.width) : 0, nW = typeof next === "object" ? pf(next.width) : 0;
  if (machine === "BDM_MRAMOR" || machine === "BDM_PP") {
    const coType = pT !== nT ? 90 : 0;
    const near = pW && nW && ((pW===75&&nW===80)||(pW===80&&nW===75));
    const coWidth = (pW && nW && pW !== nW && !near) ? 60 : 0;
    return Math.max(coType, coWidth); // MAX, cap=90
  }
  if (machine === "HANG") {
    const near = pW && nW && ((pW===75&&nW===80)||(pW===80&&nW===75));
    return (pW && nW && pW !== nW && !near) ? 60 : 0;
  }
  return 0;
}

/* ═══ SHIFTS ═══ */
function getShiftH(m, date, s) {
  const ov = s?.shiftOverrides?.[`${m}_${isoD(date)}`];
  if (ov !== undefined) return pf(ov);
  const c = (s?.shifts || DEF.shifts)[m] || { weekday: 16, weekend: 0 };
  if (date.getDay() === 0) return 0; // neděle = vždy volno (pokud není přepis)
  if (date.getDay() === 6) return pf(c.weekend); // sobota = dle nastavení
  return pf(c.weekday);
}
function getShiftStart(m, s) { const c = (s?.shifts || DEF.shifts)[m]; if (!c?.start) return 6; const [h, mi] = c.start.split(":").map(Number); return h + (mi || 0) / 60; }
function genDTs(m, s, days = 120) {
  const dts = [], now = sod(new Date()), stH = getShiftStart(m, s);
  for (let i = -1; i < days; i++) { const day = addD(now, i), shH = getShiftH(m, day, s);
    if (shH <= 0) { const st = new Date(day); st.setHours(stH, 0, 0, 0); dts.push({ id: `a_${m}_${i}`, start: st, end: addD(st, 1), machine: m, auto: 1 }); }
    else if (shH < 24) { const we = new Date(day); we.setHours(stH + shH, 0, 0, 0); const ns = addD(day, 1); ns.setHours(stH, 0, 0, 0); if (we < ns) dts.push({ id: `a_${m}_${i}`, start: we, end: ns, machine: m, auto: 1 }); }
  } return dts;
}

/* ═══ PACK COL ═══ */
function packCol(machine, orders, allDts, settings, constraints) {
  const dts = allDts.filter(d => d.machine === machine).sort((a, b) => a.start - b.start);
  const seqK = { AP1: "seqAP1", CENTRA: "seqCEN", HANG: "seqHANG" }[machine] || "seq";
  const lockK = { AP1: "lockAP1", CENTRA: "lockCEN", HANG: "lockHANG" }[machine] || "lock";
  const startK = { AP1: "psAP1", CENTRA: "psCEN", HANG: "psHANG" }[machine] || "ps";
  // Sort by user-assigned seq (drag & drop, optimizer). Deadline ordering happens in optFull.
  const sorted = [...orders].sort((a, b) => pf(a[seqK]) - pf(b[seqK]));
  const result = []; const _now = new Date();
  // Start cursor at shift start today, or now if we're already in the shift
  let cursor = sod(new Date(_now));
  const _shStart = getShiftStart(machine, settings);
  cursor.setHours(_shStart, 0, 0, 0);
  if (cursor < _now) cursor = new Date(_now); // don't plan into the past
  let prevO = null;
  for (const order of sorted) {
    if (isComplete(order)) continue;
    const aeK = AE_KEY[machine]; if (order[aeK]) continue; // phase done
    const asK = AS_KEY[machine]; const actStart = order[asK] ? pd(order[asK]) : null;
    const durH = pf(order.qty) / getNorm(machine, settings, order.type); if (durH <= 0) continue;
    // IN PROGRESS: actStart set, actEnd not → pin start at actStart (even in past)
    if (actStart) {
      const pinnedEnd = addH(actStart, durH);
      result.push({ order, start: actStart, end: pinnedEnd, coStart: null, coMin: 0, machine, durH, wip: true });
      if (pinnedEnd > cursor) cursor = new Date(pinnedEnd);
      prevO = order; continue;
    }
    // Constraints: { earliestStart, minEnd } from upstream
    const c = constraints?.[order.id];
    const earliestStart = c?.earliestStart || c; // back-compat: if plain Date, treat as earliestStart
    const minEnd = c?.minEnd;
    if (earliestStart && earliestStart > cursor) cursor = new Date(earliestStart);
    if (order[lockK] && order[startK]) { const lk = pd(order[startK]); if (lk && lk > cursor) cursor = new Date(lk); }
    let sf = 0; while (sf++ < 500) { const dt = dts.find(d => cursor >= d.start && cursor < d.end); if (dt) cursor = new Date(dt.end); else break; }
    const coMin = getCO(machine, prevO, order), coH = coMin / 60;
    const coStart = coH > 0 ? new Date(cursor) : null; cursor = addH(cursor, coH);
    let sf2 = 0; while (sf2++ < 500) { const dt = dts.find(d => cursor >= d.start && cursor < d.end); if (dt) cursor = new Date(dt.end); else break; }
    const start = new Date(cursor); let rem = durH, prodEnd = new Date(cursor), sf3 = 0;
    while (rem > 0.001 && sf3++ < 2000) {
      // skip if inside downtime
      const atDt = dts.find(d => prodEnd >= d.start && prodEnd < d.end);
      if (atDt) { prodEnd = new Date(atDt.end); continue; }
      // find next downtime after current pos
      const nd = dts.filter(d => d.start > prodEnd).sort((a,b) => a.start - b.start)[0];
      if (nd) {
        const avail = (nd.start - prodEnd) / 36e5; // hours until next downtime
        if (avail >= rem) { prodEnd = addH(prodEnd, rem); rem = 0; }
        else { rem -= avail; prodEnd = new Date(nd.end); } // consume available, jump over dt
      } else { prodEnd = addH(prodEnd, rem); rem = 0; }
    }
    // ENFORCE UPSTREAM END CONSTRAINT: downstream cannot finish before upstream
    // Machine waits for upstream material — effective end = max(prodEnd, minEnd)
    const orderEnd = (minEnd && minEnd > prodEnd) ? new Date(minEnd) : prodEnd;
    result.push({ order, start, end: orderEnd, coStart, coMin, machine, durH }); cursor = new Date(orderEnd); prevO = order;
  } return result;
}

/* ═══ PACK ALL ═══ */
function packAll(orders, manualDts, settings) {
  const allDts = []; for (const m of MK) allDts.push(...genDTs(m, settings));
  for (const d of manualDts || []) allDts.push({ ...d, start: pd(d.start) || d.start, end: pd(d.end) || d.end });
  const active = orders.filter(o => !isComplete(o) );
  const pBM = packCol("BDM_MRAMOR", active.filter(o => o.machine === "BDM_MRAMOR"), allDts, settings, null);
  const pBP = packCol("BDM_PP", active.filter(o => o.machine === "BDM_PP"), allDts, settings, null);
  // Pipeline overlap: downstream starts after 10% transfer, but must END after upstream ENDS
  const MIN_LAG_MS = 30 * 60 * 1000; // 30 minutes lag between last upstream piece and last downstream piece
  const overlapStart = (p) => addH(p.start, Math.max(1, p.durH * 0.1));

  // Build BDM constraints — { earliestStart, minEnd } per order
  const bdmC = {};
  for (const p of [...pBM, ...pBP]) {
    const ae = p.order.actEndBDM ? pd(p.order.actEndBDM) : null;
    if (ae) { p.actEnd = ae; bdmC[p.order.id] = { earliestStart: ae, minEnd: new Date(ae.getTime() + MIN_LAG_MS) }; }
    else { bdmC[p.order.id] = { earliestStart: overlapStart(p), minEnd: new Date(p.end.getTime() + MIN_LAG_MS) }; }
  }
  for (const o of active) {
    if (o.actEndBDM && !bdmC[o.id]) { const ae = pd(o.actEndBDM); bdmC[o.id] = { earliestStart: ae, minEnd: new Date(ae.getTime() + MIN_LAG_MS) }; }
    // WIP: actStart set but not actEnd — use predicted end from actStart+duration
    if (o.actStartBDM && !o.actEndBDM && !bdmC[o.id]) {
      const as = pd(o.actStartBDM), dur = pf(o.qty) / getNorm(o.machine||"BDM_MRAMOR", settings, o.type);
      const predEnd = addH(as, dur);
      bdmC[o.id] = { earliestStart: overlapStart({start:as,durH:dur}), minEnd: new Date(predEnd.getTime() + MIN_LAG_MS) };
    }
  }
  const a1o = active.filter(o => bdmC[o.id]);
  const pA1 = packCol("AP1", a1o, allDts, settings, bdmC);
  const a1C = {};
  for (const p of pA1) {
    const ae = p.order.actEndAP1 ? pd(p.order.actEndAP1) : null;
    if (ae) { p.actEnd = ae; a1C[p.order.id] = { earliestStart: ae, minEnd: new Date(ae.getTime() + MIN_LAG_MS) }; }
    else { a1C[p.order.id] = { earliestStart: overlapStart(p), minEnd: new Date(p.end.getTime() + MIN_LAG_MS) }; }
  }
  for (const o of a1o) { if (o.actEndAP1 && !a1C[o.id]) { const ae = pd(o.actEndAP1); a1C[o.id] = { earliestStart: ae, minEnd: new Date(ae.getTime() + MIN_LAG_MS) }; } }
  const pCE = packCol("CENTRA", a1o.filter(o => needsCentra(o) && a1C[o.id]), allDts, settings, a1C);
  const ceC = {};
  for (const p of pCE) {
    const ae = p.order.actEndCEN ? pd(p.order.actEndCEN) : null;
    if (ae) { p.actEnd = ae; ceC[p.order.id] = { earliestStart: ae, minEnd: new Date(ae.getTime() + MIN_LAG_MS) }; }
    else { ceC[p.order.id] = { earliestStart: overlapStart(p), minEnd: new Date(p.end.getTime() + MIN_LAG_MS) }; }
  }
  for (const o of a1o) { if (needsCentra(o) && o.actEndCEN && !ceC[o.id]) { const ae = pd(o.actEndCEN); ceC[o.id] = { earliestStart: ae, minEnd: new Date(ae.getTime() + MIN_LAG_MS) }; } }
  // HANG gets constraint from CENTRA if applicable, else AP1
  const preH = {};
  for (const o of a1o) {
    const c = needsCentra(o) && ceC[o.id] ? ceC[o.id] : (a1C[o.id] || bdmC[o.id]);
    if (c) preH[o.id] = c;
  }
  const pHA = packCol("HANG", a1o.filter(o => preH[o.id]), allDts, settings, preH);

  // ── WIP COMPUTATION ──
  // WIP = pieces finished on BDM but not yet finished on HANG (in pipeline)
  const WIP_LIMIT = 80000;
  const wipEvents = [];
  for (const p of [...pBM, ...pBP]) wipEvents.push({ time: p.end, qty: pf(p.order.qty), type: 1 }); // BDM done → enters buffer
  for (const p of pHA) wipEvents.push({ time: p.start, qty: pf(p.order.qty), type: -1 }); // HANG start → leaves buffer (onto machine → dispatch)
  wipEvents.sort((a,b) => a.time - b.time);
  let wipCur = 0, wipMax = 0, wipTimeline = [], wipOverflowDate = null;
  for (const e of wipEvents) {
    wipCur += e.qty * e.type;
    wipMax = Math.max(wipMax, wipCur);
    wipTimeline.push({ time: e.time, wip: wipCur });
    if (wipCur > WIP_LIMIT && !wipOverflowDate) wipOverflowDate = e.time;
  }
  const wipData = { timeline: wipTimeline, max: wipMax, limit: WIP_LIMIT, overflow: wipMax > WIP_LIMIT, overflowDate: wipOverflowDate, current: wipCur };

  return { BDM_MRAMOR: pBM||[], BDM_PP: pBP||[], AP1: pA1||[], CENTRA: pCE||[], HANG: pHA||[], _dts: allDts, _wip: wipData };
}

/* ═══ OPTIMIZER ═══ */
function optSeq(machine, orders) {
  const seqK = { AP1: "seqAP1", CENTRA: "seqCEN", HANG: "seqHANG" }[machine] || "seq";
  const lockK = { AP1: "lockAP1", CENTRA: "lockCEN", HANG: "lockHANG" }[machine] || "lock";
  const locked = orders.filter(o => o[lockK]).sort((a, b) => pf(a[seqK]) - pf(b[seqK]));
  const free = orders.filter(o => !o[lockK]);
  if (free.length < 2) { [...locked, ...free].forEach((o, i) => { o[seqK] = i; }); return; }

  // Deadline-first scheduling with urgency weight
  const now = Date.now();
  const scored = free.map(o => {
    let deadlineScore = 0;
    if (o.deadline) {
      const dl = pd(o.deadline);
      if (dl) {
        const daysLeft = (dl.getTime() - now) / 864e5;
        // Firmness: confirmed=3x, draft=1.5x, inquiry=0.3x
        const firm = o.status === "confirmed" ? 3 : o.status === "draft" ? 1.5 : 0.3;
        deadlineScore = -daysLeft * firm; // lower (more negative) = more urgent = earlier
      }
    }
    return { o, deadlineScore };
  });

  // Sort by deadline urgency (most urgent first)
  scored.sort((a, b) => {
    // Orders with deadlines always before orders without
    const aHasDL = !!a.o.deadline, bHasDL = !!b.o.deadline;
    if (aHasDL !== bHasDL) return aHasDL ? -1 : 1;
    if (aHasDL && bHasDL) return a.deadlineScore - b.deadlineScore;
    return 0; // both no deadline — will be inserted later
  });

  const withDL = scored.filter(s => s.o.deadline).map(s => s.o);
  const noDL = scored.filter(s => !s.o.deadline).map(s => s.o);

  // Pass 2: insert no-deadline orders into gaps to minimize changeovers
  const placed = [...withDL];
  for (const o of noDL) {
    let bestPos = placed.length, bestCO = Infinity;
    for (let pos = 0; pos <= placed.length; pos++) {
      const prev = pos > 0 ? placed[pos - 1] : (locked[locked.length - 1] || null);
      const next = pos < placed.length ? placed[pos] : null;
      const coIn = getCO(machine, prev, o) + getCO(machine, o, next);
      const coOut = prev && next ? getCO(machine, prev, next) : 0;
      const delta = coIn - coOut;
      if (delta < bestCO) { bestCO = delta; bestPos = pos; }
    }
    placed.splice(bestPos, 0, o);
  }

  // Merge locked + placed
  const merged = []; let li = 0, fi = 0;
  for (let i = 0; i < locked.length + placed.length; i++) {
    if (li < locked.length && pf(locked[li][seqK]) <= i) merged.push(locked[li++]);
    else if (fi < placed.length) merged.push(placed[fi++]);
  }
  while (li < locked.length) merged.push(locked[li++]);
  while (fi < placed.length) merged.push(placed[fi++]);
  merged.forEach((o, i) => { o[seqK] = i; });
}

function optFull(orders, settings) {
  const active = orders.filter(o => !isComplete(o) && !o.novinka);
  for (const o of active) if (!o.machine) o.machine = autoAssignBDM(o);

  // ── BDM-FIRST OPTIMIZATION WITH LOCK PRESERVATION ──
  // List is shown in BDM order (seq). Locked orders keep their slots;
  // unlocked orders are reordered around them using EDF.

  // Step 1: Snapshot current BDM order, split into locked (fixed slots) and unlocked
  const sortedBySeq = [...active].sort((a, b) => pf(a.seq) - pf(b.seq));
  const lockedWithSlots = []; // [{o, slot}]
  sortedBySeq.forEach((o, i) => { if (o.lock) lockedWithSlots.push({o, slot: i}); });
  const unlocked = [...active].filter(o => !o.lock);

  // Step 2: EDF sort unlocked
  unlocked.sort((a, b) => {
    const aD = a.deadline ? pd(a.deadline) : null, bD = b.deadline ? pd(b.deadline) : null;
    if (aD && !bD) return -1; if (!aD && bD) return 1;
    if (aD && bD) {
      const dt = aD - bD; if (Math.abs(dt) > 864e5) return dt;
      const aF = a.status==="confirmed"?0:1, bF = b.status==="confirmed"?0:1;
      if (aF !== bF) return aF - bF;
      return dt;
    }
    return 0;
  });

  // Step 3: No-deadline unlocked orders → insert into gaps minimizing changeover
  const withDL = unlocked.filter(o => o.deadline);
  const noDL = unlocked.filter(o => !o.deadline);
  const placedUnlocked = [...withDL];
  for (const o of noDL) {
    let bestPos = placedUnlocked.length, bestCO = Infinity;
    for (let pos = 0; pos <= placedUnlocked.length; pos++) {
      const prev = pos > 0 ? placedUnlocked[pos-1] : null;
      const next = pos < placedUnlocked.length ? placedUnlocked[pos] : null;
      const m = o.machine||"BDM_MRAMOR";
      const coIn = getCO(m, prev, o) + getCO(m, o, next);
      const coOut = prev && next ? getCO(m, prev, next) : 0;
      if (coIn - coOut < bestCO) { bestCO = coIn - coOut; bestPos = pos; }
    }
    placedUnlocked.splice(bestPos, 0, o);
  }

  // Step 4: Merge — locked keep slots, unlocked fill gaps
  const N = active.length;
  const result = new Array(N);
  // Place locked at their original slots (clamp + resolve conflicts by pushing forward)
  lockedWithSlots.sort((a, b) => a.slot - b.slot);
  lockedWithSlots.forEach(({o, slot}) => {
    let s = Math.min(slot, N - 1);
    while (s < N && result[s]) s++;
    if (s < N) result[s] = o;
  });
  // Fill remaining slots with unlocked in EDF order
  let ui = 0;
  for (let i = 0; i < N && ui < placedUnlocked.length; i++) {
    if (!result[i]) result[i] = placedUnlocked[ui++];
  }

  // Step 5: Propagate BDM sequence to all machines (unlocked only)
  result.forEach((o, i) => {
    if (!o) return;
    if (!o.lock) o.seq = i;
    if (!o.lockAP1) o.seqAP1 = i;
    if (!o.lockCEN) o.seqCEN = i;
    if (!o.lockHANG) o.seqHANG = i;
  });
}
function suggestDL(order, orders, dts, settings) {
  const cands = BDM_KEYS.filter(m => bdmCompat(m, order.type)); let best = null, bestM = null;
  for (const bdm of cands) { const to = { ...order, machine: bdm, seq: 9999, seqAP1: 9999, seqCEN: 9999, seqHANG: 9999 };
    const packed = packAll([...orders.filter(o => o.id !== order.id), to], dts, settings);
    const hi = packed.HANG.find(p => p.order.id === to.id); if (hi && (!best || hi.end < best)) { best = hi.end; bestM = bdm; } }
  return { deadline: best, machine: bestM };
}

/* ═══ PHASE & COMPLETION ═══ */
const AE_KEY = {BDM_MRAMOR:"actEndBDM",BDM_PP:"actEndBDM",AP1:"actEndAP1",CENTRA:"actEndCEN",HANG:"actEndHANG"};
const AS_KEY = {BDM_MRAMOR:"actStartBDM",BDM_PP:"actStartBDM",AP1:"actStartAP1",CENTRA:"actStartCEN",HANG:"actStartHANG"};
function phaseState(o, m) { const ae = o[AE_KEY[m]], as = o[AS_KEY[m]]; return ae ? "done" : as ? "wip" : "plan"; }
function orderPhases(o) {
  const p = [o.machine || "BDM_MRAMOR"]; // BDM
  p.push("AP1");
  if (needsCentra(o)) p.push("CENTRA");
  p.push("HANG");
  return p;
}
function isComplete(o) { return !!o.actEndHANG; }
function phaseDone(o, m) { return !!o[AE_KEY[m]]; }

/* ═══ DEADLINE CHECK — hotovo den předem ═══ */
function getHangEnd(order, packed) {
  const hi = (packed.HANG || []).find(p => p.order.id === order.id);
  return hi ? hi.end : null;
}
function isLate(order, packed) {
  if (!order.deadline) return false;
  const dl = pd(order.deadline);
  if (!dl) return false;
  const target = addD(dl, -1); // must finish 1 day before
  const hangEnd = getHangEnd(order, packed);
  if (!hangEnd) return false;
  return hangEnd > target;
}

/* ═══ SHIFT SIMULATOR — find optimal shifts ═══ */
function simShifts(orders, dts, testSettings) {
  const p = packAll(orders, dts, testSettings);
  const now = Date.now();
  let lateCount = 0, worstDays = 0;
  const lateList = [];
  const active = orders.filter(o => !isComplete(o) && o.deadline );
  for (const o of active) {
    const hi = (p.HANG||[]).find(x => x.order.id === o.id);
    if (!hi) continue;
    const dl = pd(o.deadline); if (!dl) continue;
    const target = addD(dl, -1);
    if (hi.end > target) {
      lateCount++;
      const daysLate = (hi.end - target) / 864e5;
      if (daysLate > worstDays) worstDays = daysLate;
      lateList.push({ id: o.id, customer: o.customer, deadline: o.deadline, hangEnd: hi.end, daysLate });
    }
  }
  // Utilization per machine
  const util = {};
  for (const m of MK) {
    const items = p[m]||[];
    const totalH = items.reduce((s,x) => s+x.durH, 0);
    let availH = 0;
    const now2 = new Date();
    for (let d=0; d<56; d++) { availH += getShiftH(m, addD(now2, d), testSettings); }
    util[m] = { totalH, availH, pct: availH > 0 ? totalH/availH : 0 };
  }
  return { lateCount, worstDays, lateList, util, packed: p };
}

// shift optimizer removed

/* ═══ STORAGE ═══ */
const DATA_KEY = "appdata";

/* ═══ LIGHT THEME ═══ */
const T = { bg: "#f5f6f8", sf: "#ffffff", alt: "#f0f1f3", bd: "#dde0e6", bl: "#ebedf0", tx: "#1e2028", tm: "#6b7280", tf: "#9ca3af", ac: "#2563eb", al: "#dbeafe" };
const iSt = { width: "100%", padding: "7px 10px", background: T.bg, border: `1px solid ${T.bd}`, borderRadius: 5, color: T.tx, fontSize: 13, outline: "none", boxSizing: "border-box" };
const bPr = { padding: "7px 14px", background: T.ac, color: "#fff", border: "none", borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const bSe = { padding: "6px 12px", background: T.alt, color: T.tx, border: `1px solid ${T.bd}`, borderRadius: 5, fontSize: 12, cursor: "pointer" };
const cSt = { background: T.sf, borderRadius: 8, padding: 16, border: `1px solid ${T.bd}` };
const lSt = { display: "block", fontSize: 11, color: T.tm, marginBottom: 3, fontWeight: 500 };

function StatusPills({ value, onChange, small }) {
  return (<div style={{ display: "flex", gap: 2 }}>{SK.map(sk => (
    <button key={sk} onClick={() => onChange(sk)} style={{ flex: 1, padding: small ? "3px 2px" : "5px 4px", borderRadius: 4, border: "none", fontSize: small ? 10 : 11, fontWeight: 600, cursor: "pointer", background: value === sk ? STATUSES[sk].color : T.alt, color: value === sk ? "#fff" : T.tm }}>{STATUSES[sk].label}</button>
  ))}</div>);
}

function Donut({ value, max, color, label, size = 68, unit = "h" }) {
  const pct = max > 0 ? clamp(value / max, 0, 1) : 0, r = (size - 8) / 2, circ = 2 * Math.PI * r;
  return (<div style={{ textAlign: "center" }}><svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.bl} strokeWidth={5}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={`${pct*circ} ${circ}`} strokeLinecap="round"/></svg><div style={{ fontSize: 10, color: T.tm, marginTop: 2 }}>{label}</div><div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(pct*100,0)}%</div><div style={{ fontSize: 9, color: T.tf }}>{fmt(value,0)}/{fmt(max,0)} {unit}</div></div>);
}

function Check({ label, checked, onChange }) {
  return (<label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.tx, cursor: "pointer", userSelect: "none" }}><input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} style={{ width: 16, height: 16, accentColor: T.ac, cursor: "pointer" }}/>{label}</label>);
}

function mkOrder(n) {
  return { id: uid(), customer: "", expL: "", type: "PP/PP", width: 75, qty: 0, status: "draft", machine: "BDM_MRAMOR", deadline: "", notes: "", novinka: true, stitek: false, vpPolep: false, etiketa: false, etiketaHang: false, seq: n, lock: false, ps: "", seqAP1: n, lockAP1: false, psAP1: "", seqCEN: n, lockCEN: false, psCEN: "", seqHANG: n, lockHANG: false, psHANG: "", actualQty: 0, actStartBDM: '', actStartAP1: '', actStartCEN: '', actStartHANG: '', actEndBDM: '', actEndAP1: '', actEndCEN: '', actEndHANG: '' };
}

/* ═══ SHIFT ANALYSIS — post-optimization ═══ */
function analyzeShifts(orders, manualDts, settings, packed) {
  const dayNames = ["Ne","Po","Út","St","Čt","Pá","So"];
  const dayCost = (dow) => dow >= 1 && dow <= 5 ? 0 : dow === 6 ? 1 : 2;
  const active = orders.filter(o => !isComplete(o) && !o.novinka);
  const increases = [], decreases = [];
  let savedH = 0, addedH = 0;

  // ── 1. FIND LATE ORDERS → suggest targeted increases ──
  const lateOrders = [];
  for (const o of active) {
    if (!o.deadline) continue;
    const he = (packed.HANG||[]).find(p => p.order.id === o.id);
    if (he) {
      const dl = pd(o.deadline), target = addD(dl, -1);
      if (he.end > target) lateOrders.push({ order: o, hangEnd: he.end, deadline: dl, deficit: (he.end - target) / 36e5 });
    }
  }
  if (lateOrders.length > 0) {
    // Per-machine deficit from late orders
    const deficits = {};
    for (const lo of lateOrders) {
      for (const m of MK) {
        const mp = (packed[m]||[]).find(p => p.order.id === lo.order.id);
        if (mp && lo.deficit > 0) deficits[m] = Math.max(deficits[m]||0, lo.deficit);
      }
    }
    for (const [m, deficit] of Object.entries(deficits)) {
      if (deficit <= 0) continue;
      const dlDate = new Date(Math.max(...lateOrders.map(lo => lo.deadline.getTime())));
      const candidates = [];
      for (let d = new Date(dlDate); d >= new Date(); d = addD(d, -1)) {
        const curH = getShiftH(m, d, settings);
        const gain = 24 - curH;
        if (gain > 0) candidates.push({ date: new Date(d), dow: d.getDay(), currentH: curH, gainH: gain,
          dbd: Math.round((dlDate - d) / 864e5), label: dayNames[d.getDay()] + " " + czD(d) });
      }
      candidates.sort((a,b) => a.dbd - b.dbd || dayCost(a.dow) - dayCost(b.dow));
      let rem = deficit; const picked = [];
      for (const c of candidates) {
        if (rem <= 0) break;
        const add = Math.min(Math.ceil(rem), c.gainH);
        picked.push({ ...c, newH: c.currentH + add });
        addedH += add; rem -= add;
      }
      if (picked.length > 0) increases.push({ machine: m, label: MACHINES[m].label, deficit: Math.ceil(deficit), days: picked.slice(0, 6),
        reason: lateOrders.filter(lo => (packed[m]||[]).find(p => p.order.id === lo.order.id)).map(lo => lo.order.customer).join(", ") });
    }
  }

  // ── 2. FIND UNDERUTILIZED DAYS → suggest reductions ──
  for (const m of MK) {
    const blocks = packed[m] || [];
    if (blocks.length === 0) continue;
    const lastEnd = blocks.reduce((max, p) => p.end > max ? p.end : max, new Date(0));
    const horizon = addD(new Date(), 60);
    const reductions = [];

    for (let d = new Date(); d <= horizon; d = addD(d, 1)) {
      const curH = getShiftH(m, d, settings);
      if (curH <= 0) continue;
      const dayStart = new Date(d); dayStart.setHours(getShiftStart(m, settings), 0, 0, 0);
      const dayEnd = addH(dayStart, curH);

      // Count production hours on this day
      let prodH = 0;
      for (const b of blocks) {
        const bs = b.start > dayStart ? b.start : dayStart;
        const be = b.end < dayEnd ? b.end : dayEnd;
        if (be > bs) prodH += (be - bs) / 36e5;
      }

      const utilization = prodH / curH;

      // Day after all production ends → full reduction
      if (d > lastEnd && d > new Date()) {
        reductions.push({ date: new Date(d), dow: d.getDay(), currentH: curH, newH: 0, savedH: curH,
          label: dayNames[d.getDay()] + " " + czD(d), reason: "po skončení výroby" });
        savedH += curH; continue;
      }

      // Weekend with < 25% utilization → suggest removal
      if ((d.getDay() === 0 || d.getDay() === 6) && utilization < 0.25 && curH > 0) {
        const newH = 0;
        reductions.push({ date: new Date(d), dow: d.getDay(), currentH: curH, newH, savedH: curH,
          label: dayNames[d.getDay()] + " " + czD(d), reason: `${fmt(utilization*100,0)}% využití` });
        savedH += curH; continue;
      }

      // Weekday with < 30% utilization → suggest reducing to actual + buffer
      if (utilization < 0.3 && curH > 8 && d.getDay() >= 1 && d.getDay() <= 5) {
        const newH = Math.max(8, Math.ceil(prodH * 1.3)); // actual + 30% buffer, min 8h
        if (newH < curH) {
          reductions.push({ date: new Date(d), dow: d.getDay(), currentH: curH, newH, savedH: curH - newH,
            label: dayNames[d.getDay()] + " " + czD(d), reason: `${fmt(utilization*100,0)}% využití` });
          savedH += (curH - newH);
        }
      }
    }
    if (reductions.length > 0) decreases.push({ machine: m, label: MACHINES[m].label, days: reductions.slice(0, 8) });
  }

  // ── 3. WIP BUFFER ANALYSIS ──
  const WIP_LIMIT = 80000;
  const wip = packed._wip;
  let wipSuggestion = null;
  if (wip && wip.max > WIP_LIMIT * 0.7) {
    // Calculate sustainable BDM rate
    // BDM throughput = average norm * BDM hours/day
    // HANG throughput = hang norm * HANG hours/day (bottleneck)
    const hangNorm = getNorm("HANG", settings, "MRAMOR"); // ~350
    const bdmNormAvg = (getNorm("BDM_MRAMOR", settings, "MRAMOR") + getNorm("BDM_MRAMOR", settings, "PP/PAP")) / 2;
    const hangShift = (settings?.shifts?.HANG?.weekday) || 16;
    const hangDaily = hangNorm * hangShift; // ks/day HANG can consume

    // How many hours BDM should run to match HANG throughput
    const sustainableBdmH = Math.ceil(hangDaily / bdmNormAvg);

    // Current BDM hours
    const bdmShift = (settings?.shifts?.BDM_MRAMOR?.weekday) || 24;

    // Days until overflow (if BDM outproduces)
    const bdmDaily = bdmNormAvg * bdmShift;
    const dailyDelta = bdmDaily - hangDaily;
    const daysToOverflow = dailyDelta > 0 ? Math.floor(WIP_LIMIT / dailyDelta) : Infinity;

    wipSuggestion = {
      wipMax: wip.max,
      wipLimit: WIP_LIMIT,
      wipPct: Math.round(wip.max / WIP_LIMIT * 100),
      overflow: wip.overflow,
      overflowDate: wip.overflowDate,
      bdmCurrent: bdmShift,
      bdmSustainable: Math.min(sustainableBdmH, 24),
      hangThroughput: hangDaily,
      bdmThroughput: bdmDaily,
      dailyDelta: Math.round(dailyDelta),
      daysToOverflow: daysToOverflow === Infinity ? null : daysToOverflow,
    };

    // If BDM is overproducing, add to decreases
    if (bdmShift > sustainableBdmH && dailyDelta > 0) {
      const bdmReduction = bdmShift - Math.min(sustainableBdmH + 2, bdmShift); // +2h buffer for flexibility
      if (bdmReduction > 0) {
        savedH += bdmReduction * 5; // ~5 weekdays saved per week
        // Don't add duplicate if already suggested
        const existing = decreases.find(d => d.machine === "BDM_MRAMOR" && d.wipRelated);
        if (!existing) {
          decreases.push({
            machine: "BDM_MRAMOR", label: MACHINES.BDM_MRAMOR.label, wipRelated: true,
            days: [{ label: "Všední dny", currentH: bdmShift, newH: Math.min(sustainableBdmH + 2, 24),
              savedH: bdmReduction, reason: `WIP: BDM vyrábí ${Math.round(dailyDelta)} ks/den víc než HANG stíhá` }]
          });
        }
      }
    }
  }

  return { increases, decreases, savedH: Math.round(savedH), addedH: Math.round(addedH), netH: Math.round(savedH - addedH),
    lateCount: lateOrders.length, wipSuggestion };
}

/* ═══ ROLE ═══ */
async function resolveRole(u,e){if(supabase){try{const{data:d,error:r}=await supabase.from("user_roles").select("role,label").eq("user_id",u).single();if(d&&!r)return{role:d.role,label:d.label||e.split("@")[0]};}catch{}}return{role:"viewer",label:e.split("@")[0]};}
function Login({onLogin}){const[email,setEmail]=useState("");const[pass,setPass]=useState("");const[err,setErr]=useState("");const[loading,setLoading]=useState(false);
const tryLogin=async()=>{if(!email||!pass){setErr("Vyplňte");return;}setLoading(true);setErr("");if(supabase){try{const{data,error}=await supabase.auth.signInWithPassword({email,password:pass});if(error)throw error;const{role,label}=await resolveRole(data.user.id,email);onLogin({id:data.user.id,email,role,label});}catch(e){setErr(e.message);}}else{const ou={"admin@emba.cz":"admin","plan@emba.cz":"planner","view@emba.cz":"viewer"};const r=ou[email];if(r&&pass.length>=1)onLogin({id:email,email,role:r,label:email.split("@")[0]});else setErr("Offline");}setLoading(false);};
return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg,fontFamily:"'Inter',system-ui,sans-serif"}}><div style={{...cSt,width:340,padding:32,boxShadow:"0 8px 30px rgba(0,0,0,.08)"}}><div style={{fontSize:20,fontWeight:700,color:"#c2410c",marginBottom:4}}>EMBA Pořadače</div><div style={{fontSize:12,color:T.tm,marginBottom:20}}>APS Plánovač výroby</div><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{...iSt,marginBottom:8}} onKeyDown={e=>e.key==="Enter"&&tryLogin()} autoFocus/><input placeholder="Heslo" type="password" value={pass} onChange={e=>setPass(e.target.value)} style={{...iSt,marginBottom:8}} onKeyDown={e=>e.key==="Enter"&&tryLogin()}/>{err&&<div style={{fontSize:12,color:"#dc2626",marginBottom:8}}>{err}</div>}<button onClick={tryLogin} disabled={loading} style={{...bPr,width:"100%",opacity:loading?0.6:1}}>{loading?"Přihlašuji...":"Přihlásit"}</button>{!hasSupabase&&<div style={{fontSize:10,color:T.tf,textAlign:"center",marginTop:12}}>Offline</div>}</div></div>);}
export default function App(){const[loggedIn,setLoggedIn]=useState(null);const[checking,setChecking]=useState(true);
useEffect(()=>{if(!supabase){setChecking(false);return;}(async()=>{const{data:{session}}=await supabase.auth.getSession();if(session?.user){const{role,label}=await resolveRole(session.user.id,session.user.email);setLoggedIn({id:session.user.id,email:session.user.email,role,label});}setChecking(false);})();},[]);
if(checking)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:T.tm}}>Ověřuji...</div>;if(!loggedIn)return<Login onLogin={setLoggedIn}/>;
const handleLogout=async()=>{if(supabase)await supabase.auth.signOut();setLoggedIn(null);};return<AppInner user={loggedIn} onLogout={handleLogout}/>;}
function AppInner({ user, onLogout }) {
  const [orders, setOrders] = useState(SAMPLE.map(o=>({...o})));
  const [dts, setDts] = useState([]);
    const [settings, setSettings] = useState(DEF);
  const [view, setView] = useState("dashboard");
  const [editId, setEditId] = useState(null);
  const [selId, setSelId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dbOk, setDbOk] = useState(null); // null=checking, true=online, false=offline

  const [needsOpt, setNeedsOpt] = useState(false);
  useEffect(() => { (async () => {
    try {
      const d = await dbLoad(DATA_KEY);
      if (d?.orders?.length) { setOrders(d.orders); if (d.dts) setDts(d.dts); if (d.settings) setSettings({...DEF,...d.settings}); } else { setNeedsOpt(true); }
      setDbOk(true);
    } catch { setDbOk(false); }
    setLoaded(true);
  })(); }, []);
  useEffect(() => { if (needsOpt && loaded && orders.length > 0) { handleOpt(); setNeedsOpt(false); } }, [needsOpt, loaded]);
  useEffect(() => { if (loaded) { try { dbSave(DATA_KEY, { orders, dts, settings }); } catch { setDbOk(false); } } }, [orders, dts, settings, loaded]);

  const packed = useMemo(() => packAll(orders, dts, settings), [orders, dts, settings]);
  useEffect(() => { window.__embaSetSettings = setSettings; return () => { delete window.__embaSetSettings; }; }, [setSettings]);
  const [optResult, setOptResult] = useState(null);
  const ro = user.role === "viewer";
  const upd = (id, patch) => setOrders(p => p.map(o => o.id === id ? {...o,...patch} : o));
  const del = (id) => { setOrders(p => p.filter(o => o.id !== id)); if (editId === id) setEditId(null); if (selId === id) setSelId(null); };

  const handleOpt = () => {
    const n = orders.map(o=>({...o})); optFull(n, settings); setOrders(n);
    // Post-optimization shift analysis
    setTimeout(() => {
      const p = packAll(n, dts, settings);
      const analysis = analyzeShifts(n, dts, settings, p);
      if (analysis.increases.length > 0 || analysis.decreases.length > 0) setOptResult(analysis);
      else setOptResult(null);
    }, 50);
  };
  const newOrder = () => { const o = mkOrder(orders.length); setOrders(p => [...p, o]); setEditId(o.id); setView("form"); };

  if (!loaded) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: T.tm, fontFamily: "system-ui" }}>Načítám…</div>;

  const tabs = [["dashboard","Dashboard"],["form","Zakázky"],["gantt","Gantt"],["settings","Nastavení"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.bg, color: T.tx, fontFamily: "'Inter',system-ui,sans-serif", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "0 16px", height: 46, background: T.sf, borderBottom: `1px solid ${T.bd}`, gap: 6, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginRight: 16, color: "#c2410c" }}>EMBA Pořadače</div>
        {tabs.map(([k,l]) => <button key={k} onClick={() => setView(k)} style={{ padding: "5px 12px", borderRadius: 5, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", background: view === k ? T.ac : "transparent", color: view === k ? "#fff" : T.tm }}>{l}</button>)}
        <div style={{ flex: 1 }}/>
        <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",background:dbOk?"#f0fdf4":"#fef2f2",borderRadius:4,border:`1px solid ${dbOk?"#bbf7d0":"#fecaca"}`}} title={dbOk?(hasSupabase?"Supabase":"localStorage"):"Nelze uložit — offline režim"}>
          <div style={{width:7,height:7,borderRadius:"50%",background:dbOk===null?"#d1d5db":dbOk?"#16a34a":"#dc2626"}}/>
          <span style={{fontSize:10,fontWeight:500,color:dbOk?"#15803d":"#dc2626"}}>{dbOk===null?"…":dbOk?(hasSupabase?"Supabase":"Local"):"Offline"}</span>
        </div>
        <span style={{fontSize:11,color:T.tm}}>{user.label}</span>
        <span style={{fontSize:9,padding:"2px 6px",borderRadius:3,background:user.role==="admin"?"#dc2626":user.role==="planner"?"#2563eb":"#6b7280",color:"#fff",fontWeight:600}}>{user.role}</span>
        <button onClick={onLogout} style={{...bSe,padding:"3px 8px",fontSize:10}}>Odhlásit</button>
        {user.role!=="viewer"&&<button onClick={newOrder} style={{...bPr, padding: "5px 12px", fontSize: 12}}>+ Zakázka</button>}
      </div>
      {/* Optimization result panel */}
      {optResult && <div style={{padding:"8px 16px",background:"#eff6ff",borderBottom:`1px solid #bfdbfe`,fontSize:11,flexShrink:0,maxHeight:200,overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <b style={{fontSize:12}}>⚡ Výsledek optimalizace</b>
          <button onClick={()=>setOptResult(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.tm}}>✕</button>
        </div>
        <div style={{display:"flex",gap:16,marginBottom:6,flexWrap:"wrap"}}>
          {optResult.lateCount > 0 && <span style={{color:"#dc2626"}}>⚠ Nestíhá: <b>{optResult.lateCount}</b> zakázek</span>}
          {optResult.savedH > 0 && <span style={{color:"#16a34a"}}>▼ Úspora: <b>{optResult.savedH}h</b> směn</span>}
          {optResult.addedH > 0 && <span style={{color:"#d97706"}}>▲ Navýšení: <b>{optResult.addedH}h</b></span>}
          <span style={{fontWeight:700,color:optResult.netH>0?"#16a34a":"#d97706"}}>Čistý efekt: {optResult.netH>0?"+":"" }{optResult.netH}h {optResult.netH>0?"úspora":"navýšení"}</span>
        </div>
        {optResult.increases.length > 0 && <div style={{marginBottom:4}}>
          <b style={{color:"#d97706"}}>▲ Doporučené navýšení (blízko termínů):</b>
          {optResult.increases.map((sg,i) => <div key={i} style={{marginLeft:8,marginTop:2}}>
            <b>{sg.label}</b> ({sg.reason}):
            {sg.days.map((d,j) => <span key={j} style={{marginLeft:4}}>{d.label} {d.currentH}→<b>{d.newH}h</b></span>)}
          </div>)}
        </div>}
        {optResult.decreases.length > 0 && <div style={{marginBottom:4}}>
          <b style={{color:"#16a34a"}}>▼ Doporučené snížení (nízké využití):</b>
          {optResult.decreases.map((sg,i) => <div key={i} style={{marginLeft:8,marginTop:2}}>
            <b>{sg.label}</b>{sg.wipRelated?" 📦":""}:
            {sg.days.slice(0,4).map((d,j) => <span key={j} style={{marginLeft:4}}>{d.label} {d.currentH}→<b>{d.newH}h</b> <span style={{color:T.tf}}>({d.reason})</span></span>)}
            {sg.days.length > 4 && <span style={{color:T.tf}}> +{sg.days.length-4} dalších</span>}
          </div>)}
        </div>}
        {optResult.wipSuggestion && <div style={{marginBottom:4,padding:"6px 8px",background:optResult.wipSuggestion.overflow?"#fef2f2":"#fffbeb",borderRadius:4,border:`1px solid ${optResult.wipSuggestion.overflow?"#fecaca":"#fde68a"}`}}>
          <b>📦 Mezioperační sklad (WIP)</b>
          <div style={{display:"flex",gap:12,marginTop:3,flexWrap:"wrap"}}>
            <span>Max: <b style={{color:optResult.wipSuggestion.wipPct>90?"#dc2626":optResult.wipSuggestion.wipPct>70?"#d97706":"#16a34a"}}>{optResult.wipSuggestion.wipMax.toLocaleString("cs")} ks</b> / {optResult.wipSuggestion.wipLimit.toLocaleString("cs")} ({optResult.wipSuggestion.wipPct}%)</span>
            {optResult.wipSuggestion.dailyDelta > 0 && <span>BDM přebytek: <b style={{color:"#d97706"}}>{optResult.wipSuggestion.dailyDelta.toLocaleString("cs")} ks/den</b></span>}
            {optResult.wipSuggestion.daysToOverflow && <span style={{color:"#dc2626"}}>Přetečení za <b>{optResult.wipSuggestion.daysToOverflow} dní</b></span>}
          </div>
          {optResult.wipSuggestion.bdmCurrent > optResult.wipSuggestion.bdmSustainable && <div style={{marginTop:3,color:"#1e40af"}}>
            💡 Optimální BDM směna: <b>{optResult.wipSuggestion.bdmSustainable}h/den</b> (teď {optResult.wipSuggestion.bdmCurrent}h) — srovná BDM s kapacitou HANG ({optResult.wipSuggestion.hangThroughput.toLocaleString("cs")} ks/den)
          </div>}
          <div style={{marginTop:3,height:8,background:"#e5e7eb",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:Math.min(optResult.wipSuggestion.wipPct,100)+"%",background:optResult.wipSuggestion.wipPct>90?"#dc2626":optResult.wipSuggestion.wipPct>70?"#f59e0b":"#16a34a",borderRadius:4,transition:"width 0.3s"}}/>
          </div>
        </div>}
        <button onClick={() => {
          const ov = { ...(settings.shiftOverrides || {}) };
          for (const sg of [...optResult.increases, ...optResult.decreases]) {
            for (const d of sg.days) {
              if (d.date) { ov[`${sg.machine}_${isoD(d.date)}`] = d.newH; }
            }
          }
          // Apply global BDM shift reduction from WIP analysis
          const wipSg = optResult.wipSuggestion;
          let newSettings = {...settings, shiftOverrides: ov};
          if (wipSg && wipSg.bdmCurrent > wipSg.bdmSustainable) {
            const optH = Math.min(wipSg.bdmSustainable + 2, 24);
            newSettings = {...newSettings, shifts: {...newSettings.shifts,
              BDM_MRAMOR: {...newSettings.shifts.BDM_MRAMOR, weekday: optH},
              BDM_PP: {...newSettings.shifts.BDM_PP, weekday: optH}
            }};
          }
          setSettings(newSettings);
          setOptResult(prev => ({...prev, applied: true}));
        }} disabled={optResult.applied} style={{...bPr,padding:"4px 14px",fontSize:11,opacity:optResult.applied?0.5:1}}>
          {optResult.applied ? "✓ Změny aplikovány" : "Aplikovat všechny změny směn"}
        </button>
      </div>}
      <div style={{ flex: 1, overflow: (view === "gantt" || view === "form") ? "hidden" : "auto", padding: (view === "gantt" || view === "form") ? 0 : 16 }}>
        {view === "dashboard" && <Dash orders={orders} packed={packed} settings={settings} ro={ro} onEdit={id => { setEditId(id); setView("form"); }} dts={dts} setSettings={ro?()=>{}:setSettings}/>}
        {view === "form" && <FormV orders={orders} editId={editId} setEditId={setEditId} upd={ro?()=>{}:upd} del={ro?()=>{}:del} ro={ro} settings={settings} dts={dts} packed={packed} onOpt={ro?()=>{}:handleOpt} setOrders={ro?()=>{}:setOrders}/>}
        {view === "gantt" && <Gantt orders={orders} setOrders={ro?()=>{}:setOrders} packed={packed} ro={ro} dts={dts} setDts={setDts} settings={settings} selId={selId} setSelId={setSelId} upd={ro?()=>{}:upd} onOpt={ro?()=>{}:handleOpt} onEdit={id => { setEditId(id); setView("form"); }}/>}
        {view === "settings" && <Sett settings={settings} setSettings={ro?()=>{}:setSettings} orders={orders} setOrders={ro?()=>{}:setOrders} ro={ro} dts={dts} setDts={setDts}/>}
      </div>
    </div>
  );
}

/* ═══ DASHBOARD ═══ */
function Dash({ orders, packed, settings, ro, onEdit, dts, setSettings }) {
  const active = orders.filter(o => !isComplete(o)), confirmed = active.filter(o => o.status === "confirmed");
  // Per-week capacity over 8 weeks
  const weeks = 8; const now2 = new Date();
  const capData = MK.map(m => {
    const items = packed[m]||[]; const totalH = items.reduce((s,p)=>s+p.durH,0);
    const ks = items.reduce((s,p)=>s+pf(p.order.qty),0);
    // Calculate actual available hours over planning horizon (per-week)
    let availH = 0;
    for (let w=0; w<weeks; w++) for (let d=0; d<7; d++) { const day = addD(now2, w*7+d); availH += getShiftH(m, day, settings); }
    return { m, h: totalH, maxH: availH, ks, label: MACHINES[m].label, color: MACHINES[m].color, pct: availH>0?totalH/availH:0 };
  });
  const lateOrders = active.filter(o => isLate(o, packed));
  // Shift recommendations
  const hangCap = capData.find(c=>c.m==="HANG");
  const shiftRecs = [];
  capData.forEach(c => {
    if (c.m === "HANG") return;
    if (c.pct > 0.9 && hangCap && hangCap.pct < 0.7) shiftRecs.push({m:c.m,type:"up",msg:`${c.label}: ${fmt(c.pct*100,0)}% zatížení — zvažte přidání směn`});
    if (c.pct < 0.4 && c.h > 0 && hangCap && hangCap.pct > 0.5) shiftRecs.push({m:c.m,type:"down",msg:`${c.label}: ${fmt(c.pct*100,0)}% — zvažte snížení směn (úspora nákladů, snížení WIP)`});
  });
  const upcoming = active.filter(o => o.deadline).sort((a,b) => new Date(a.deadline)-new Date(b.deadline)).slice(0,6);
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[["Aktivní", active.length, T.ac],["Potvrzené", confirmed.length, "#16a34a"],["Celkem ks", active.reduce((s,o)=>s+pf(o.qty),0).toLocaleString("cs"), "#c2410c"]].map(([l,v,c],i) => (
          <div key={i} style={{...cSt, borderLeft: `3px solid ${c}`, padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, flex: "1 1 120px"}}><span style={{ fontSize: 11, color: T.tm }}>{l}</span><span style={{ fontSize: 18, fontWeight: 700 }}>{v}</span></div>
        ))}
        {packed._wip && (() => {
          const w = packed._wip, pct = Math.round(w.max / w.limit * 100);
          const color = pct > 90 ? "#dc2626" : pct > 70 ? "#d97706" : "#16a34a";
          return <div style={{...cSt, borderLeft: `3px solid ${color}`, padding: "6px 12px", flex: "1 1 180px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:T.tm}}>📦 WIP</span>
              <span style={{fontSize:18,fontWeight:700}}>{w.max.toLocaleString("cs")}</span>
              <span style={{fontSize:10,color:T.tf}}>/ {w.limit.toLocaleString("cs")} ({pct}%)</span>
            </div>
            <div style={{height:5,background:"#e5e7eb",borderRadius:3,marginTop:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(pct,100)+"%",background:color,borderRadius:3}}/>
            </div>
            {w.overflow && <div style={{fontSize:9,color:"#dc2626",marginTop:2,fontWeight:600}}>⚠ Přetečení skladu! {w.overflowDate ? czD(w.overflowDate) : ""}</div>}
          </div>;
        })()}
      </div>
      <div style={{...cSt, marginBottom: 16}}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Kapacita strojů</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>{capData.map(c => <Donut key={c.m} value={c.h} max={c.maxH||1} color={c.color} label={c.label} unit="h" size={56}/>)}
          <div style={{ width: "100%", marginTop: 8, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", fontSize: 11, color: T.tm }}>{capData.map(c => <span key={c.m}><b style={{color:MACHINES[c.m].color}}>{c.label}:</b> {c.ks.toLocaleString("cs")} ks</span>)}</div></div>
        <div style={{fontSize:9,color:T.tf,marginTop:4,textAlign:"center"}}>Horizont: {weeks} týdnů</div>
        {shiftRecs.length>0 && <div style={{marginTop:8,padding:"8px 10px",background:T.alt,border:`1px solid ${T.bl}`,borderRadius:6,fontSize:11}}>
          <b>Doporučení směn:</b>
          {shiftRecs.map((r,i)=><div key={i} style={{marginTop:2,color:r.type==="up"?"#92400e":"#1e40af"}}>{r.type==="up"?"▲":"▼"} {r.msg}</div>)}
        </div>}
      </div>

      <ShiftOptPanel orders={orders} dts={dts} settings={settings} setSettings={ro?()=>{}:setSettings}/>
      {lateOrders.length > 0 && <div style={{...cSt, marginBottom: 16, borderLeft: "3px solid #dc2626"}}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#dc2626" }}>⚠ Nestíhá se (hotovo po deadline-1d): {lateOrders.length}</div>
        {lateOrders.map(o => {
          const he = getHangEnd(o, packed);
          return (<div key={o.id} onClick={() => onEdit(o.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 5, background: "#fef2f2", cursor: "pointer", marginBottom: 3, border: "1px solid #fecaca" }}>
            <div style={{ flex: 1, fontSize: 11, fontWeight: 500 }}>{o.customer||`#${o.id.slice(0,4)}`}</div>
            <div style={{ fontSize: 11, color: T.tm }}>{o.type} {o.width} | {o.qty.toLocaleString("cs")} ks</div>
            <div style={{ fontSize: 11 }}><span style={{color:"#dc2626"}}>Termín: {czD(o.deadline)}</span> · <span style={{color:T.tm}}>HANG hotov: {czDT(he)}</span></div>
          </div>);
        })}
      </div>}
      <div style={cSt}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Blížící se termíny</div>
        {upcoming.length === 0 ? <div style={{ color: T.tm, fontSize: 12 }}>Žádné</div> : upcoming.map(o => {
          const dl = pd(o.deadline), dL = dl ? Math.ceil((dl-Date.now())/864e5) : null;
          return (<div key={o.id} onClick={() => onEdit(o.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 5, background: T.alt, cursor: "pointer", marginBottom: 3, border: `1px solid ${T.bl}` }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: dL!=null&&dL<3?"#dc2626":dL<7?"#d97706":"#16a34a" }}/>
            <div style={{ flex: 1, fontSize: 11, fontWeight: 500 }}>{o.customer||`#${o.id.slice(0,4)}`}</div>
            <div style={{ fontSize: 11, color: T.tm }}>{o.type} {o.width}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: dL!=null&&dL<3?"#dc2626":T.tx }}>{czD(o.deadline)}</div>
          </div>);
        })}
      </div>
    </div>
  );
}

/* ═══ SHIFT OPTIMIZER PANEL ═══ */
function ShiftOptPanel({ orders, dts, settings, setSettings }) {
  const [sim, setSim] = useState(null);

  // Run simulation whenever settings change
  useEffect(() => {
    const s = simShifts(orders, dts, settings);
    setSim(s);
  }, [orders, dts, settings]);

  const adjustShift = (machine, field, delta) => {
    const steps = [0, 8, 12, 16, 24];
    setSettings(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.shifts) next.shifts = {};
      if (!next.shifts[machine]) next.shifts[machine] = { weekday: 16, weekend: 0, start: "06:00" };
      const cur = pf(next.shifts[machine][field]);
      const idx = steps.indexOf(cur);
      const newIdx = clamp(idx + delta, 0, steps.length - 1);
      next.shifts[machine][field] = steps[newIdx];
      return next;
    });
  };

  if (!sim) return null;

  return (
    <div style={{...cSt, marginBottom: 16}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Optimalizace směn</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {sim.lateCount === 0
            ? <span style={{fontSize:11,color:"#16a34a",fontWeight:600}}>✓ Všechny termíny splněny</span>
            : <span style={{fontSize:11,color:"#dc2626",fontWeight:600}}>⚠ {sim.lateCount} zakázek nestíhá (max +{fmt(sim.worstDays,0)}d)</span>}

        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr>
          <th style={thSO}>Stroj</th>
          <th style={thSO}>Prac. den</th>
          <th style={thSO}>Sobota</th>
          <th style={thSO}>Start</th>
          <th style={thSO}>Vytížení</th>
          <th style={thSO}>Stav</th>
        </tr></thead>
        <tbody>
          {MK.map(m => {
            const c = settings?.shifts?.[m] || DEF.shifts[m];
            const u = sim.util[m];
            const pct = u.pct;
            const barColor = pct > 0.95 ? "#dc2626" : pct > 0.8 ? "#f59e0b" : pct > 0.5 ? "#16a34a" : "#6b7280";
            return (
              <tr key={m}>
                <td style={tdSO}><span style={{color:MACHINES[m].color,fontWeight:600}}>{MACHINES[m].label}</span></td>
                <td style={tdSO}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <button onClick={()=>adjustShift(m,"weekday",-1)} style={shBtn}>−</button>
                    <span style={{fontWeight:600,minWidth:24,textAlign:"center"}}>{pf(c.weekday)}h</span>
                    <button onClick={()=>adjustShift(m,"weekday",1)} style={shBtn}>+</button>
                  </div>
                </td>
                <td style={tdSO}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <button onClick={()=>adjustShift(m,"weekend",-1)} style={shBtn}>−</button>
                    <span style={{fontWeight:600,minWidth:24,textAlign:"center"}}>{pf(c.weekend)}h</span>
                    <button onClick={()=>adjustShift(m,"weekend",1)} style={shBtn}>+</button>
                  </div>
                </td>
                <td style={tdSO}>
                  <input type="time" value={c.start||"06:00"} onChange={e=>{
                    setSettings(prev=>{const n=JSON.parse(JSON.stringify(prev));if(!n.shifts)n.shifts={};if(!n.shifts[m])n.shifts[m]={...DEF.shifts[m]};n.shifts[m].start=e.target.value;return n;});
                  }} style={{padding:"2px 4px",fontSize:11,border:`1px solid ${T.bd}`,borderRadius:3,background:T.bg,color:T.tx,width:70}}/>
                </td>
                <td style={tdSO}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{flex:1,height:8,background:T.bl,borderRadius:4,overflow:"hidden"}}>
                      <div style={{width:`${Math.min(pct*100,100)}%`,height:"100%",background:barColor,borderRadius:4}}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:600,color:barColor,minWidth:35}}>{fmt(pct*100,0)}%</span>
                  </div>
                </td>
                <td style={tdSO}>
                  <span style={{fontSize:10,color:pct>0.95?"#dc2626":pct>0.8?"#d97706":"#16a34a"}}>
                    {pct>0.95?"Přetížen":pct>0.8?"Vytížen":pct>0.5?"OK":"Volný"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sim.lateCount > 0 && (
        <div style={{marginTop:8,padding:"6px 8px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:5,fontSize:11}}>
          <b style={{color:"#dc2626"}}>Kolize ({sim.lateCount}):</b>
          {sim.lateList.slice(0,5).map((l,i)=>(
            <span key={i} style={{marginLeft:6,color:"#92400e"}}>{l.customer} (termín {czD(l.deadline)}, HANG +{fmt(l.daysLate,0)}d)</span>
          ))}
          {sim.lateList.length>5 && <span style={{color:T.tf}}> …a {sim.lateList.length-5} dalších</span>}
        </div>
      )}

      {/* Shift Calendar — overrides */}
      <DashShiftCal settings={settings} setSettings={setSettings} packed={sim?.packed} orders={orders}/>
    </div>
  );
}

/* ═══ DASHBOARD SHIFT CALENDAR ═══ */
function DashShiftCal({ settings, setSettings, packed, orders }) {
  const [showDays, setShowDays] = useState(28);
  const today = sod(new Date());
  const days = Array.from({length:showDays},(_,i) => addD(today,i));
  const dn = ["Ne","Po","Út","St","Čt","Pá","So"];
  const bgC = {0:"#f3f4f6",8:"#dbeafe",12:"#d1fae5",16:"#fef3c7",24:"#ede9fe"};

  const uS = (path, val) => {
    setSettings(prev => {
      const n = JSON.parse(JSON.stringify(prev));
      const k = path.split("."); let o = n;
      for (let i=0;i<k.length-1;i++){if(!o[k[i]])o[k[i]]={};o=o[k[i]];}
      o[k[k.length-1]]=val; return n;
    });
  };

  const cycle = (m, d) => {
    const key=`${m}_${isoD(d)}`, cur=settings?.shiftOverrides?.[key],
      def=getShiftH(m,d,{...settings,shiftOverrides:{}});
    if (cur===undefined) { const ni=(SHIFT_OPTS.indexOf(def)+1)%SHIFT_OPTS.length; uS(`shiftOverrides.${key}`,SHIFT_OPTS[ni]); }
    else { const ni=(SHIFT_OPTS.indexOf(cur)+1)%SHIFT_OPTS.length;
      if(SHIFT_OPTS[ni]===def){const n={...(settings?.shiftOverrides||{})};delete n[key];uS("shiftOverrides",n);}
      else uS(`shiftOverrides.${key}`,SHIFT_OPTS[ni]); }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600 }}>Směnový kalendář (klikni buňku = přepis)</span>
        <button onClick={() => setShowDays(d => d === 28 ? 90 : 28)} style={{...bSe, padding: "2px 8px", fontSize: 9}}>
          {showDays === 28 ? "90 dní →" : "← 28 dní"}
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 10 }}>
          <thead><tr><th style={{...thSO,minWidth:70,fontSize:9}}>Stroj</th>
            {days.map((d,i) => <th key={i} style={{...thSO,textAlign:"center",padding:"2px 1px",minWidth:26,fontSize:9,color:isWE(d)?"#dc2626":T.tm}}>
              <div>{dn[d.getDay()]}</div><div>{d.getDate()}</div></th>)}
          </tr></thead>
          <tbody>{MK.map(m => (
            <tr key={m}><td style={tdSO}><span style={{color:MACHINES[m].color,fontWeight:600,fontSize:9}}>{MACHINES[m].label}</span></td>
              {days.map((d,i) => { const h=getShiftH(m,d,settings), key=`${m}_${isoD(d)}`, isOv=settings?.shiftOverrides?.[key]!==undefined;
                return <td key={i} onClick={()=>cycle(m,d)} style={{...tdSO,textAlign:"center",cursor:"pointer",padding:"2px 1px",
                  background:bgC[h]||"#f3f4f6",border:isOv&&pf(settings?.shiftOverrides?.[key])!==getShiftH(m,d,{...settings,shiftOverrides:{}})?"2px solid #d97706":`1px solid ${T.bl}`,
                  fontWeight:isOv?700:400,color:h===0?T.tf:T.tx,fontSize:10}}>{h}</td>;
              })}</tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ fontSize: 9, color: T.tf, marginTop: 2 }}>
        Výchozí vzor platí neomezeně. Oranžový rámeček = přepis na konkrétní den. Vše se přepočítá okamžitě.
      </div>
    </div>
  );
}

const thSO = {padding:"6px 8px",textAlign:"left",borderBottom:`1px solid ${T.bd}`,color:T.tm,fontSize:11,fontWeight:500};
const tdSO = {padding:"6px 8px",borderBottom:`1px solid ${T.bl}`};
const shBtn = {width:22,height:22,borderRadius:4,border:`1px solid ${T.bd}`,background:T.alt,color:T.tx,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"};

/* ═══ ORDER ROW — compact, info-rich, phase checkboxes ═══ */
function OrdRow({ o, sel, dragging, onSel, upd, packed, onDragStart, selected, onShiftSel, onLockToggle, ro }) {
  const late = isLate(o, packed);
  const complete = isComplete(o);
  const phaseList = orderPhases(o);
  const [hangPrompt, setHangPrompt] = useState(false);
  const [hangTime, setHangTime] = useState("");
  const flagDefs = [{k:"stitek",l:"Štítek"},{k:"vpPolep",l:"VP Polep"},{k:"etiketa",l:"Etiketa"},{k:"etiketaHang",l:"Et. HANG"}];
  const isNovinka = !!o.novinka;

  // Get BDM and HANG packed times
  const bdmP = (packed[o.machine]||[]).find(p=>p.order.id===o.id);
  const hangP = (packed.HANG||[]).find(p=>p.order.id===o.id);

  const handlePhaseClick = (m, aeK, currentState) => {
    if (ro) return;
    const asK = AS_KEY[m];
    if (currentState === "plan") {
      // PLAN → WIP: start producing. Cascade: start all previous phases too if not started
      const phases = orderPhases(o);
      const idx = phases.indexOf(m);
      const now = Date.now();
      const patch = {};
      for (let i = 0; i <= idx; i++) {
        const pm = phases[i], ask = AS_KEY[pm], aek = AE_KEY[pm];
        if (!o[ask]) patch[ask] = new Date(now - (idx - i) * 2000).toISOString();
        // If previous phases weren't started, auto-complete them (they must be done if current is starting)
        if (i < idx && !o[aek]) patch[aek] = new Date(now - (idx - i) * 1000).toISOString();
      }
      upd(o.id, patch);
    } else if (currentState === "wip") {
      // WIP → DONE: finish this phase
      if (m === "HANG") { setHangPrompt(true); setHangTime(new Date().toISOString().slice(0,16)); }
      else {
        const phases = orderPhases(o);
        const idx = phases.indexOf(m);
        const now = Date.now();
        const patch = { [aeK]: new Date().toISOString() };
        // Cascade: finish all previous phases too
        for (let i = 0; i < idx; i++) {
          const pm = phases[i], ask = AS_KEY[pm], aek = AE_KEY[pm];
          if (!o[ask]) patch[ask] = new Date(now - (idx - i) * 2000).toISOString();
          if (!o[aek]) patch[aek] = new Date(now - (idx - i) * 1000).toISOString();
        }
        upd(o.id, patch);
      }
    } else {
      // DONE → PLAN: clear both actStart and actEnd (full reset)
      const asK = AS_KEY[m];
      upd(o.id, { [aeK]: "", [asK]: "" });
    }
  };

  const bg = dragging ? "#fef3c7" : selected ? "#c7d2fe" : sel ? T.al : complete ? "#f3f4f6" : isNovinka ? "#fff7ed" : late ? "#fef2f2" : T.sf;
  const bd = dragging ? "#f59e0b" : selected ? "#6366f1" : sel ? T.ac : complete ? "#d1d5db" : isNovinka ? "#fb923c" : late ? "#fecaca" : T.bd;

  return (
    <div onClick={(e) => { if (!ro && (e.shiftKey || e.ctrlKey || e.metaKey) && onShiftSel) onShiftSel(e); else onSel(); }}
      style={{ padding: "0", borderRadius: 6, marginBottom: 2, background: bg, border: `1px solid ${bd}`, opacity: complete ? 0.45 : 1, cursor: "pointer", display: "flex" }}>
      {/* Drag handle + lock (always visible for planned orders) */}
      {onLockToggle ? (
        <div style={{ display: "flex", flexDirection: "column", width: 14, flexShrink: 0, borderRadius: "6px 0 0 6px", overflow: "hidden" }}>
          <div onPointerDown={e => { if (!ro && !o.lock && onDragStart) { e.stopPropagation(); onDragStart(e); } }}
            style={{ flex: 1, cursor: (ro || o.lock) ? "not-allowed" : "grab", background: o.lock ? "#fecaca" : sel ? "#93c5fd" : "#e5e7eb",
              display: "flex", alignItems: "center", justifyContent: "center", touchAction: "none", opacity: o.lock ? 0.5 : 1 }}>
            <span style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1 }}>⠿</span>
          </div>
          <div onClick={e => { e.stopPropagation(); if(!ro) onLockToggle(o.id); }}
            title={o.lock?"Odemknout":"Zamknout (zamkne i předchozí zakázky v BDM pořadí)"}
            style={{ height: 14, cursor: "pointer", background: o.lock ? "#dc2626" : "#f3f4f6", color: o.lock ? "#fff" : "#9ca3af",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>
            {o.lock ? "🔒" : "🔓"}
          </div>
        </div>
      ) : <div style={{ width: 4, flexShrink: 0, background: "#d1d5db", borderRadius: "6px 0 0 6px" }}/>}
      <div style={{ flex: 1, padding: "6px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
          {/* Pipeline - fixed 90px */}
          <div style={{width:90,flexShrink:0}}>
            {complete ? <span style={{fontSize:9,padding:"2px 4px",background:"#d1d5db",borderRadius:3,color:"#4b5563",fontWeight:600}}>✓ {o.actEndHANG?czDT(o.actEndHANG):""}</span>
            : <div style={{display:"flex",gap:1}}>
                {SK.map(sk => <div key={sk} onClick={e=>{e.stopPropagation();if(!ro)upd(o.id,{status:sk});}}
                  style={{padding:"2px 5px",borderRadius:3,fontSize:9,fontWeight:600,cursor:"pointer",
                    background:o.status===sk?STATUSES[sk].color:T.alt,color:o.status===sk?"#fff":T.tf}}>{STATUSES[sk].label.slice(0,4)}</div>)}
              </div>}
          </div>
          {/* Customer - fixed 170px */}
          <div style={{width:180,flexShrink:0,overflow:"hidden",paddingRight:6}}>
            <div style={{fontSize:13,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{o.customer||`#${o.id.slice(0,4)}`}</div>
            {o.expL&&<div style={{fontSize:9,color:T.tf,marginTop:-1}}>{o.expL}</div>}
          </div>
          {/* Type - fixed 55px */}
          <div style={{width:55,flexShrink:0,fontWeight:700,color:T.tx}}>{o.type}</div>
          {/* Width - fixed 35px */}
          <div style={{width:35,flexShrink:0,color:T.tm}}>{o.width}</div>
          {/* Qty - fixed 65px right-aligned */}
          <div style={{width:70,flexShrink:0,fontWeight:500,textAlign:"right",paddingRight:8}}>{pf(o.qty).toLocaleString("cs")}</div>
          {/* BDM start */}
          <div style={{width:85,flexShrink:0,textAlign:"center"}} title={bdmP?`BDM: ${czDT(bdmP.start)} → ${czDT(bdmP.end)}`:""}>
            {bdmP?<span style={{fontSize:9,padding:"1px 4px",background:"#fef3c7",borderRadius:3,color:"#92400e"}}>{czDT(bdmP.start)}</span>:<span/>}
          </div>
          {/* HANG start */}
          <div style={{width:85,flexShrink:0,textAlign:"center"}} title={hangP?`HANG: ${czDT(hangP.start)} → ${czDT(hangP.end)}`:""}>
            {hangP?<span style={{fontSize:9,padding:"1px 4px",background:"#dbeafe",borderRadius:3,color:"#1e40af"}}>{czDT(hangP.start)}</span>:<span/>}
          </div>
          {/* Flags */}
          <div style={{width:100,flexShrink:0,display:"flex",gap:2,overflow:"hidden"}}>
            {o.machine==="BDM_PP"&&<span style={{fontSize:8,padding:"1px 4px",background:"#e0e7ff",borderRadius:3,color:"#3730a3",fontWeight:600}}>PP</span>}
            {isNovinka&&<span style={{fontSize:8,padding:"1px 4px",background:"#fb923c",borderRadius:3,color:"#fff",fontWeight:700}}>NOVINKA</span>}
            {flagDefs.map(f=>o[f.k]?<span key={f.k} style={{fontSize:8,padding:"1px 4px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:2,color:"#15803d",fontWeight:500}}>{f.l}</span>:null)}
          </div>
          {/* Notes */}
          <div style={{width:100,flexShrink:0,fontSize:9,color:T.tf,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={o.notes||""}>{o.notes||""}</div>
          {/* Phases */}
          <div style={{flex:1,display:"flex",gap:2,justifyContent:"flex-end"}}>
            {phaseList.map(m=>{
              const aeK=AE_KEY[m], ps=phaseState(o,m);
              const lb={BDM_MRAMOR:"BDM",BDM_PP:"PP",AP1:"AP1",CENTRA:"CEN",HANG:"H"}[m];
              const bg = ps==="done"?"#16a34a":ps==="wip"?"#f59e0b":T.alt;
              const fg = ps==="done"?"#fff":ps==="wip"?"#fff":T.tm;
              const bd = ps==="done"?"#16a34a":ps==="wip"?"#f59e0b":T.bd;
              const icon = ps==="done"?"✓":ps==="wip"?"▶":lb;
              const title = ps==="done"?`${MACHINES[m].label} ✓ hotovo (klik = zpět)`:ps==="wip"?`${MACHINES[m].label} ▶ probíhá (klik = dokončit)`:`${MACHINES[m].label} (klik = zahájit)`;
              return <div key={m} onClick={e=>{e.stopPropagation();handlePhaseClick(m,aeK,ps);}} title={title}
                style={{padding:"2px 5px",borderRadius:3,fontSize:9,fontWeight:600,cursor:ro?"default":"pointer",
                  background:bg,color:fg,border:`1px solid ${bd}`}}>{icon}</div>;
            })}
          </div>
          {/* Deadline — prominent, rightmost, with tight-margin warning */}
          <div style={{width:120,flexShrink:0,marginLeft:8,display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"}}>
            {o.deadline ? (() => {
              const isConfirmed = o.status === "confirmed";
              const bg = late ? "#dc2626" : isConfirmed ? "#2563eb" : "#60a5fa";
              // Margin warning: either HANG end is ≤2 days from deadline, OR deadline is ≤2 days from today
              const dl = pd(o.deadline);
              let tight = false;
              if (dl && !late) {
                const he = hangP?.end;
                const daysToDeadline = (dl - new Date()) / 864e5;
                if (he) {
                  const marginDays = (dl - he) / 864e5;
                  if (marginDays <= 2) tight = true;
                } else if (daysToDeadline <= 2 && daysToDeadline > 0) {
                  tight = true;
                }
              }
              return <>
                {tight && <span title="Těsný termín — méně než 2 dny rezervy" style={{fontSize:14,color:"#f59e0b",fontWeight:800,lineHeight:1}}>⚠</span>}
                <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:4,background:bg,color:"#fff",whiteSpace:"nowrap"}} title={isConfirmed?"Závazný termín":"Orientační termín"}>
                  {czD(o.deadline)}
                </span>
              </>;
            })() : <span style={{fontSize:10,color:T.tf,fontStyle:"italic"}}>bez termínu</span>}
          </div>
        </div>

      {/* HANG prompt */}
      {hangPrompt && (
        <div onClick={e=>e.stopPropagation()} style={{ marginTop: 4, padding: "5px 8px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 5, display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#92400e", whiteSpace: "nowrap" }}>HANG skutečný konec:</span>
          <input type="datetime-local" value={hangTime} onChange={e => setHangTime(e.target.value)}
            style={{ padding: "2px 4px", fontSize: 10, border: "1px solid #fde68a", borderRadius: 3, background: "#fff", color: T.tx, flex: 1 }}/>
          <button onClick={() => {
            const hangEnd = new Date(hangTime).toISOString();
            const phases = orderPhases(o);
            const patch = { actEndHANG: hangEnd, [AS_KEY["HANG"]]: o[AS_KEY["HANG"]] || new Date(new Date(hangTime).getTime() - 3600000).toISOString() };
            // Cascade: start+finish all preceding phases if not already done
            for (let i = 0; i < phases.length - 1; i++) {
              const pm = phases[i], ask = AS_KEY[pm], aek = AE_KEY[pm];
              const offset = (phases.length - 1 - i);
              if (!o[ask]) patch[ask] = new Date(new Date(hangTime).getTime() - offset * 2000).toISOString();
              if (!o[aek]) patch[aek] = new Date(new Date(hangTime).getTime() - offset * 1000).toISOString();
            }
            upd(o.id, patch); setHangPrompt(false);
          }}
            style={{ padding: "2px 8px", fontSize: 10, fontWeight: 600, background: "#16a34a", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>✓</button>
          <button onClick={() => setHangPrompt(false)}
            style={{ padding: "2px 6px", fontSize: 10, background: T.alt, color: T.tm, border: `1px solid ${T.bd}`, borderRadius: 3, cursor: "pointer" }}>✕</button>
        </div>
      )}
      </div>
    </div>
  );
}

/* ═══ FORM VIEW — master-detail layout ═══ */
function FormV({ orders, editId, setEditId, upd, del, settings, dts, packed, onOpt, setOrders, ro }) {
  const activeCount = orders.filter(o => !isComplete(o) && !o.novinka).length;
  const novinkas = orders.filter(o => o.novinka && !isComplete(o));
  const planned = orders.filter(o => !o.novinka && !isComplete(o)).sort((a,b) => pf(a.seq) - pf(b.seq));
  const completed = orders.filter(o => isComplete(o)).sort((a,b) => pd(b.actEndHANG) - pd(a.actEndHANG));
  const sortedOrders = [...novinkas, ...planned, ...completed];
  const dragRef = useRef(null);
  const [dragId, setDragId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const lastSelIdRef = useRef(null);

  const handleRowSelect = (e, orderId) => {
    if (e.shiftKey && lastSelIdRef.current) {
      // Range select within planned list
      const ids = planned.map(o => o.id);
      const i1 = ids.indexOf(lastSelIdRef.current), i2 = ids.indexOf(orderId);
      if (i1 >= 0 && i2 >= 0) {
        const [from, to] = [Math.min(i1,i2), Math.max(i1,i2)];
        setSelectedIds(new Set(ids.slice(from, to+1)));
      }
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => { const n = new Set(prev); if (n.has(orderId)) n.delete(orderId); else n.add(orderId); return n; });
      lastSelIdRef.current = orderId;
    } else {
      setSelectedIds(new Set([orderId]));
      lastSelIdRef.current = orderId;
    }
  };

  // Chain lock: locking a block locks all preceding in BDM sequence; unlocking affects only that block
  const toggleLock = (orderId) => {
    setOrders(prev => {
      const next = prev.map(o => ({...o}));
      const target = next.find(o => o.id === orderId);
      if (!target) return prev;
      if (target.lock) {
        // Unlock — just this one (BDM only)
        target.lock = false;
      } else {
        // Lock BDM position — this one AND all preceding in BDM seq
        // Does NOT lock AP1/CEN/HANG (downstream follows BDM order anyway)
        const sorted = next.filter(o => !isComplete(o) && !o.novinka).sort((a,b) => pf(a.seq) - pf(b.seq));
        const idx = sorted.findIndex(o => o.id === orderId);
        for (let i = 0; i <= idx; i++) {
          sorted[i].lock = true;
        }
      }
      return next;
    });
  };
  const order = orders.find(o => o.id === editId);
  // Auto-select first active order if none selected
  useEffect(() => { if (!order && sortedOrders.length > 0) setEditId(sortedOrders[0].id); }, []);

  const handleDragStart = (e, orderId) => {
    if (ro) return;
    setDragId(orderId);
    e.preventDefault();
    dragRef.current = { orderId, startY: e.clientY };
    const onMove = ev => {
      if (!dragRef.current) return;
      const dy = ev.clientY - dragRef.current.startY;
      const delta = Math.round(dy / 36);
      if (delta !== 0) {
        setOrders(prev => {
          const next = prev.map(o => ({...o}));
          const ao = next.filter(o => !isComplete(o) && !o.novinka).sort((a,b) => pf(a.seq) - pf(b.seq));
          // Multi-select move: drag all selected together
          const selIds = selectedIds.size > 1 && selectedIds.has(dragRef.current.orderId) ? selectedIds : new Set([dragRef.current.orderId]);
          const movingIdxs = ao.map((o,i) => selIds.has(o.id) ? i : -1).filter(i => i >= 0);
          if (movingIdxs.length === 0) return prev;
          // Skip if any in selection is locked
          if (movingIdxs.some(i => ao[i].lock)) return prev;
          const firstIdx = movingIdxs[0];
          const ni = clamp(firstIdx + delta, 0, ao.length - movingIdxs.length);
          if (ni === firstIdx) return prev;
          // Find the range of unlocked positions — can't cross locked zones
          const lockedIdxs = ao.map((o,i) => o.lock ? i : -1).filter(i => i >= 0 && !selIds.has(ao[i].id));
          // If any locked block is between firstIdx and ni, block the move
          const [lo, hi] = [Math.min(firstIdx, ni), Math.max(firstIdx + movingIdxs.length - 1, ni + movingIdxs.length - 1)];
          if (lockedIdxs.some(li => li >= lo && li <= hi && !movingIdxs.includes(li))) return prev;
          // Extract, re-insert
          const moving = movingIdxs.map(i => ao[i]);
          const rest = ao.filter(o => !selIds.has(o.id));
          rest.splice(ni, 0, ...moving);
          rest.forEach((o, i) => { if (!o.lock) { o.seq = i; o.seqAP1 = i; o.seqCEN = i; o.seqHANG = i; } });
          dragRef.current.startY = ev.clientY;
          return next;
        });
      }
    };
    const onUp = () => { dragRef.current = null; setDragId(null); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* LEFT: scrollable order list */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 8px 8px 12px", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, padding: "0 8px" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Zakázky ({activeCount}/{orders.length}) — HANG pořadí</span>
          <button onClick={onOpt} style={{...bPr, padding: "4px 12px", fontSize: 11}}>⚡ Optimalizovat</button>
        </div>
        {/* Column headers — sticky */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: T.tf, fontWeight: 500, padding: "2px 8px 2px 22px", borderBottom: `1px solid ${T.bl}`, marginBottom: 2, position: "sticky", top: 0, background: T.bg, zIndex: 5 }}>
          <div style={{width:90}}>Status</div>
          <div style={{width:180}}>Zákazník</div>
          <div style={{width:55}}>Typ</div>
          <div style={{width:35}}>mm</div>
          <div style={{width:70,textAlign:"right",paddingRight:8}}>Kusy</div>
          <div style={{width:85,textAlign:"center"}}>BDM start</div>
          <div style={{width:85,textAlign:"center"}}>HANG start</div>
          <div style={{width:100}}>Příznaky</div>
          <div style={{width:100}}>Poznámka</div>
          <div style={{flex:1,textAlign:"right"}}>Fáze</div>
          <div style={{width:120,marginLeft:8,textAlign:"center"}}>Termín</div>
        </div>
        {novinkas.length > 0 && <div style={{fontSize:11,fontWeight:700,color:"#c2410c",padding:"8px 8px 4px",marginTop:4,background:"#fff7ed",borderRadius:4}}>🆕 Novinky ({novinkas.length}) — neplánují se</div>}
        {novinkas.map(o => (
          <OrdRow key={o.id} o={o} sel={o.id===editId} dragging={false}
            onSel={() => setEditId(o.id)} upd={upd} packed={packed} onDragStart={null} selected={false} onShiftSel={null} ro={ro}/>
        ))}
        {planned.length > 0 && <div style={{fontSize:11,fontWeight:700,color:T.tm,padding:"8px 8px 4px",marginTop:4}}>📋 Plánované ({planned.length}) — BDM pořadí</div>}
        {planned.map(o => (
          <OrdRow key={o.id} o={o} sel={o.id===editId} dragging={o.id===dragId}
            onSel={() => setEditId(o.id)} upd={upd} packed={packed}
            onDragStart={!o.lock ? (e) => handleDragStart(e, o.id) : null}
            selected={selectedIds.has(o.id)} onShiftSel={(e) => handleRowSelect(e, o.id)}
            onLockToggle={ro?null:toggleLock} ro={ro}/>
        ))}
        {completed.length > 0 && <div style={{fontSize:11,fontWeight:700,color:T.tf,padding:"8px 8px 4px",marginTop:4}}>✓ Dokončené ({completed.length})</div>}
        {completed.map(o => (
          <OrdRow key={o.id} o={o} sel={o.id===editId} dragging={false}
            onSel={() => setEditId(o.id)} upd={upd} packed={packed} onDragStart={null} selected={false} onShiftSel={null} ro={ro}/>
        ))}
      </div>
      {/* RIGHT: anchored detail panel — independently scrollable */}
      <div style={{ width: 380, flexShrink: 0, borderLeft: `1px solid ${T.bd}`, background: T.sf, overflowY: "auto", overflowX: "hidden" }}>
        {order
          ? <div style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{order.customer || `#${order.id.slice(0,4)}`}</div>
                <button onClick={() => setEditId(null)} style={{ background: "none", border: "none", color: T.tm, cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
              <OrdEd order={order} upd={ro?()=>{}:upd} del={ro?()=>{}:del} ro={ro} settings={settings} orders={orders} dts={dts} packed={packed} setOrders={ro?()=>{}:setOrders}/>
            </div>
          : <div style={{ padding: 40, textAlign: "center", color: T.tf, fontSize: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
              Klikni na zakázku<br/>pro zobrazení detailu
            </div>
        }
      </div>
    </div>
  );
}

function SuggestBtn({ order, orders, dts, settings }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(isoD(new Date()));
  const [to, setTo] = useState(isoD(addD(new Date(), 30)));
  const [result, setResult] = useState(null);
  if (!open) return <button onClick={() => setOpen(true)} style={{...bSe,padding:"4px 10px",fontSize:11}}>Navrhnout termín</button>;
  const run = () => {
    const s = suggestDL(order, orders, dts, settings);
    const fromD = pd(from), toD = pd(to);
    if (s.deadline) {
      // Strict range: clamp deadline to range
      if (fromD && s.deadline < fromD) {
        s.deadline = fromD;
        s.adjusted = "Nejdřívější termín posunut na začátek rozmezí.";
      }
      if (toD && s.deadline > toD) {
        s.deadline = toD;
        s.adjusted = "Termín by přesáhl rozmezí — zkrácen na konec rozmezí.";
      }
      // Analyze conflicts: which orders would be affected
      const tempOrders = [...orders.filter(o=>o.id!==order.id), {...order, deadline: s.deadline.toISOString().slice(0,10)}];
      const tempPacked = packAll(tempOrders, dts, settings);
      const conflicts = [];
      for (const o of tempOrders) {
        if (isComplete(o) || o.novinka || !o.deadline) continue;
        const he = (tempPacked.HANG||[]).find(p=>p.order.id===o.id);
        if (he) {
          const dl = pd(o.deadline), target = addD(dl, -1);
          if (he.end > target) conflicts.push({ order: o, hangEnd: he.end, deadline: dl });
        }
      }
      s.conflicts = conflicts;
      // Suggest shift extensions for bottleneck machines
      if (conflicts.length > 0) {
        // Calculate per-machine deficit: how many hours each machine needs
        const deficits = {};
        for (const c of conflicts) {
          for (const m of MK) {
            const mp = (tempPacked[m]||[]).find(p=>p.order.id===c.order.id);
            if (mp && c.hangEnd > c.deadline) {
              const gap = (c.hangEnd - c.deadline) / 36e5;
              deficits[m] = Math.max(deficits[m]||0, gap);
            }
          }
        }
        // For each machine with deficit, find specific days to extend
        const suggestions = [];
        const dayCost = (dow) => dow >= 1 && dow <= 5 ? 0 : dow === 6 ? 1 : 2;
        const dayNames = ["Ne","Po","Út","St","Čt","Pá","So"];
        for (const [m, deficit] of Object.entries(deficits)) {
          if (deficit <= 0) continue;
          // Scan days BEFORE latest conflict deadline (backwards — closer to deadline = more impact)
          const dlDate = new Date(Math.max(...conflicts.map(c=>c.deadline.getTime())));
          const candidates = [];
          for (let d = new Date(dlDate); d >= new Date(); d = addD(d, -1)) {
            const curH = getShiftH(m, d, settings);
            const dow = d.getDay();
            const gain = 24 - curH;
            if (gain > 0) {
              const daysBeforeDL = Math.round((dlDate - d) / 864e5);
              candidates.push({ date: new Date(d), dow, currentH: curH, gainH: gain, daysBeforeDL,
                label: dayNames[dow] + " " + czD(d) });
            }
          }
          // Sort: closest to deadline first, within same distance prefer cheaper days
          candidates.sort((a,b) => a.daysBeforeDL - b.daysBeforeDL || dayCost(a.dow) - dayCost(b.dow));
          // Greedily pick minimum days to cover deficit — extend each day only as much as needed
          let remaining = deficit;
          const picked = [];
          for (const c of candidates) {
            if (remaining <= 0) break;
            // Take only what we need from this day, rounded up to whole hours
            const needed = Math.ceil(remaining);
            const addH = Math.min(needed, c.gainH);
            const newH = c.currentH + addH;
            picked.push({ ...c, newH });
            remaining -= addH;
          }
          if (picked.length > 0) {
            suggestions.push({ machine: m, machineLabel: MACHINES[m].label, deficit: Math.ceil(deficit), days: picked.slice(0, 6) });
          }
        }
        s.shiftSuggestions = suggestions;
      }
    }
    setResult(s);
  };
  return (
    <div style={{padding:"8px 10px",background:T.alt,border:`1px solid ${T.bd}`,borderRadius:5,fontSize:11}}>
      <div style={{fontSize:11,fontWeight:600,marginBottom:4}}>Navrhnout termín v rozmezí:</div>
      <div style={{display:"flex",gap:4,marginBottom:6}}>
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{...iSt,fontSize:10,padding:"3px 5px",flex:1}}/>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{...iSt,fontSize:10,padding:"3px 5px",flex:1}}/>
      </div>
      <div style={{display:"flex",gap:4}}>
        <button onClick={run} style={{...bPr,padding:"3px 10px",fontSize:10}}>Spočítat</button>
        <button onClick={()=>{setOpen(false);setResult(null);}} style={{...bSe,padding:"3px 10px",fontSize:10}}>Zavřít</button>
      </div>
      {result && <div style={{marginTop:6,padding:"6px 8px",background:T.sf,borderRadius:4,fontSize:11}}>
        {result.deadline
          ? <><b>Termín:</b> {czDT(result.deadline)} (stroj {result.machine})
              {result.adjusted && <div style={{color:"#d97706",fontSize:10,marginTop:2}}>⚠ {result.adjusted}</div>}
              {result.conflicts?.length > 0 && <div style={{marginTop:4,color:"#dc2626",fontSize:10}}>
                <b>Ohrožené zakázky ({result.conflicts.length}):</b>
                {result.conflicts.slice(0,5).map((c,i) => <div key={i}>· {c.order.customer} ({czD(c.order.deadline)}) — HANG +{fmt((c.hangEnd-c.deadline)/36e5,1)}h</div>)}
              </div>}
              {result.shiftSuggestions?.length > 0 && <div style={{marginTop:4,color:"#1e40af",fontSize:10}}>
                <b>Doporučené změny směn (minimum úprav):</b>
                {result.shiftSuggestions.map((sg,i) => <div key={i} style={{marginTop:3,padding:"3px 6px",background:"#eff6ff",borderRadius:3,border:"1px solid #bfdbfe"}}>
                  <b>{sg.machineLabel}</b> (deficit: {sg.deficit}h)
                  {sg.days.map((d,j) => <div key={j} style={{marginLeft:8}}>▲ {d.label}: {d.currentH}h → <b>{d.newH}h</b> (+{d.newH-d.currentH}h)</div>)}
                </div>)}
                <button onClick={() => {
                  // Apply all suggested overrides
                  const ov = { ...(settings.shiftOverrides || {}) };
                  for (const sg of result.shiftSuggestions) {
                    for (const d of sg.days) {
                      ov[`${sg.machine}_${isoD(d.date)}`] = d.newH;
                    }
                  }
                  upd && upd(order.id, { deadline: result.deadline ? isoD(result.deadline) : order.deadline });
                  // Update settings via parent (setSettings comes through)
                  if (typeof setOrders === 'function') {
                    // Trigger settings change through a custom event or direct call
                  }
                  // Apply overrides to settings
                  const newSettings = { ...settings, shiftOverrides: ov };
                  if (window.__embaSetSettings) window.__embaSetSettings(newSettings);
                  setResult({...result, applied: true});
                }} disabled={result.applied} style={{...bPr,padding:"3px 10px",fontSize:10,marginTop:4,opacity:result.applied?0.5:1}}>
                  {result.applied ? "✓ Aplikováno" : "Aplikovat změny směn"}
                </button>
              </div>}
          </>
          : <span style={{color:"#dc2626"}}>Nelze naplánovat</span>}
      </div>}
    </div>
  );
}

function DeleteBtn({ onDelete }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) return (
    <div style={{display:"flex",gap:4,padding:"6px 8px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:5}}>
      <span style={{fontSize:11,color:"#dc2626",flex:1,fontWeight:600}}>Opravdu smazat?</span>
      <button onClick={onDelete} style={{...bSe,padding:"2px 10px",fontSize:11,background:"#dc2626",color:"#fff",border:"none"}}>Ano, smazat</button>
      <button onClick={()=>setConfirm(false)} style={{...bSe,padding:"2px 10px",fontSize:11}}>Zrušit</button>
    </div>
  );
  return <button onClick={()=>setConfirm(true)} style={{...bSe, color: "#dc2626", borderColor: "#fecaca", width: "100%"}}>Smazat zakázku</button>;
}

/* ═══ ORDER EDITOR ═══ */
function OrdEd({ order, upd, del, settings, orders, dts, packed, ro, setOrders }) {
  const [sug, setSug] = useState(null);
  const u = (f,v) => upd(order.id,{[f]:v});
  const handleType = t => upd(order.id,{type:t});
  const pp = {}; for (const m of MK) { const it = (packed[m]||[]).find(p => p.order.id===order.id); if (it) pp[m] = it; }
  const norm = getNorm(order.machine||"BDM_MRAMOR", settings, order.type), durH = pf(order.qty)/norm;
  return (
    <div style={cSt}>
      <StatusPills value={order.status} onChange={s => u("status",s)}/>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        <div><label style={lSt}>Zákazník</label><input value={order.customer} onChange={e => u("customer",e.target.value)} style={iSt} placeholder="Zákazník"/></div>
        <div><label style={lSt}>EXP.L</label><input value={order.expL||""} onChange={e => u("expL",e.target.value)} style={iSt} placeholder="EXP.L"/></div>
        <div><label style={lSt}>Typ</label><select value={order.type} onChange={e => handleType(e.target.value)} style={iSt}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label style={lSt}>Šířka (mm)</label><select value={order.width} onChange={e => u("width",pf(e.target.value))} style={iSt}>{WIDTHS.map(w => <option key={w} value={w}>{w}</option>)}</select></div>
        <div><label style={lSt}>Množství (ks)</label><input type="number" value={order.qty||""} onChange={e => u("qty",pf(e.target.value))} style={iSt}/></div>
        <div><label style={lSt}>Termín</label><input type="date" value={order.deadline||""} onChange={e => u("deadline",e.target.value)} style={iSt}/></div>
        <div><label style={lSt}>Stroj BDM</label><select value={order.machine} onChange={e => u("machine",e.target.value)} style={iSt}>{BDM_KEYS.filter(m => bdmCompat(m,order.type)).map(m => <option key={m} value={m}>{MACHINES[m].label}</option>)}</select></div>

      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 14, padding: "10px 12px", background: T.alt, borderRadius: 6, border: `1px solid ${T.bl}` }}>
        <Check label="Novinka" checked={order.novinka} onChange={v => {
          if (!v && order.deadline) {
            // Novinka → planned: insert at correct position by deadline
            const planned = orders.filter(o => !o.novinka && !isComplete(o) && o.id !== order.id).sort((a,b) => pf(a.seq) - pf(b.seq));
            let insertIdx = planned.length;
            for (let i = 0; i < planned.length; i++) {
              if (planned[i].deadline && order.deadline <= planned[i].deadline) { insertIdx = i; break; }
              if (!planned[i].deadline) { insertIdx = i; break; }
            }
            // Check if neighbors are locked → inherit lock
            const shouldLock = insertIdx > 0 && planned[insertIdx - 1]?.lock;
            const newSeq = insertIdx;
            // Shift all orders at/after insertIdx
            const patch = { novinka: false, seq: newSeq, seqAP1: newSeq, seqCEN: newSeq, seqHANG: newSeq, lock: shouldLock };
            const updatedOrders = orders.map(o => {
              if (o.id === order.id) return { ...o, ...patch };
              if (!o.novinka && !isComplete(o) && pf(o.seq) >= newSeq) {
                return { ...o, seq: pf(o.seq) + 1, seqAP1: pf(o.seqAP1) + 1, seqCEN: pf(o.seqCEN) + 1, seqHANG: pf(o.seqHANG) + 1 };
              }
              return o;
            });
            setOrders(updatedOrders);
          } else {
            u("novinka", v);
          }
        }}/>
        <Check label="Štítek" checked={order.stitek} onChange={v => u("stitek",v)}/>
        <Check label="VP Polep" checked={order.vpPolep} onChange={v => u("vpPolep",v)}/>
        <Check label="Etiketa" checked={order.etiketa} onChange={v => u("etiketa",v)}/>
        <Check label="Etiketa HANG" checked={order.etiketaHang} onChange={v => u("etiketaHang",v)}/>
      </div>
      <div style={{ marginTop: 10 }}><label style={lSt}>Poznámka</label><textarea value={order.notes||""} onChange={e => u("notes",e.target.value)} style={{...iSt, height: 48, resize: "vertical"}} placeholder="Poznámka…"/></div>
      <div style={{ marginTop: 12, padding: 10, background: T.alt, borderRadius: 6, fontSize: 12, border: `1px solid ${T.bl}` }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: T.tm }}>
          <span>Norma: <b style={{color:T.tx}}>{fmt(norm,0)} ks/h</b></span>
          <span>Čas BDM: <b style={{color:T.tx}}>{fH(durH)}</b></span>
          <span>Flow: <b style={{color:T.tx}}>BDM → AP-1{needsCentra(order)?" → CENTRA":""} → HANG</b></span>
        </div>
        {Object.keys(pp).length > 0 && <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MK.map(m => { const p = pp[m]; if (!p) return null; return <span key={m} style={{ padding: "2px 6px", background: MACHINES[m].color+"18", borderRadius: 4, border: `1px solid ${MACHINES[m].color}33`, fontSize: 11, color: MACHINES[m].color, fontWeight: 500 }}>{MACHINES[m].label}: {czDT(p.start)} → {czDT(p.end)}</span>; })}
        </div>}
        <div style={{ marginTop: 8 }}>
          <SuggestBtn order={order} orders={orders} dts={dts} settings={settings}/>
        </div>
      </div>
      <div style={{ marginTop: 14 }}><DeleteBtn onDelete={() => del(order.id)}/></div>
    </div>
  );
}

/* ═══ GANTT ═══ */
function Gantt({ orders, setOrders, packed, dts, setDts, settings, selId, setSelId, upd, onOpt, onEdit, ro }) {
  const [zoom, setZoom] = useState(12);
  const [showDtM, setShowDtM] = useState(false);
  const dragRef = useRef(null);
  const scrollRef = useRef(null);
  const now = new Date(), startDate = sod(addD(now,-7)), endDate = addD(now,90);
  const scrollToNow = () => { if (scrollRef.current) { const nowY = ((now - startDate) / 36e5) * zoom + 34; scrollRef.current.scrollTop = Math.max(0, nowY - 80); } };
  useEffect(scrollToNow, []);
  const totalH = (endDate-startDate)/36e5;
  const tY = t => ((t-startDate)/36e5)*zoom;
  const colW = 148, hdrH = 34;
  const days = []; for (let d = new Date(startDate); d < endDate; d = addD(d,1)) days.push(new Date(d));

  const handleDrag = (e, order, machine) => {
    if (ro) return;
    const lockK = {AP1:"lockAP1",CENTRA:"lockCEN",HANG:"lockHANG"}[machine]||"lock";
    if (order[lockK]) return;
    e.preventDefault();
    const seqK = {AP1:"seqAP1",CENTRA:"seqCEN",HANG:"seqHANG"}[machine]||"seq";
    // Determine downstream seqKeys (machines AFTER this one in flow)
    const flow = ["seq","seqAP1","seqCEN","seqHANG"];
    const flowLocks = ["lock","lockAP1","lockCEN","lockHANG"];
    const myFlowIdx = flow.indexOf(seqK);
    const downstreamKeys = flow.slice(myFlowIdx + 1);
    const downstreamLocks = flowLocks.slice(myFlowIdx + 1);

    dragRef.current = { orderId: order.id, machine, startY: e.clientY, seqK, lockK, downstreamKeys, downstreamLocks };
    const onMove = ev => { if (!dragRef.current) return; const dy = ev.clientY - dragRef.current.startY, delta = Math.round(dy/30);
      if (delta !== 0) { setOrders(prev => { const next = prev.map(o=>({...o}));
        const sk = dragRef.current.seqK, lk = dragRef.current.lockK;
        const mO = next.filter(o => { if (MACHINES[machine].phase===1) return o.machine===machine && !o.novinka; if (machine==="CENTRA") return needsCentra(o) && !o.novinka; return !isComplete(o) && !o.novinka; }).sort((a,b) => pf(a[sk])-pf(b[sk]));
        const idx = mO.findIndex(o => o.id===dragRef.current.orderId); if (idx<0) return prev;
        const ni = clamp(idx+delta,0,mO.length-1); if (ni===idx) return prev;
        // Can't swap with locked block on this machine
        if (mO[ni] && mO[ni][lk]) return prev;
        // Upstream constraint check: can't move earlier if upstream hasn't produced material yet
        if (ni < idx) {
          const getUpstreamEnd = (ord) => {
            if (machine === "AP1") return (packed[ord.machine||"BDM_MRAMOR"]||[]).find(p=>p.order.id===ord.id)?.end;
            if (machine === "CENTRA") return (packed.AP1||[]).find(p=>p.order.id===ord.id)?.end;
            if (machine === "HANG") {
              const ce = needsCentra(ord) ? (packed.CENTRA||[]).find(p=>p.order.id===ord.id)?.end : null;
              return ce || (packed.AP1||[]).find(p=>p.order.id===ord.id)?.end;
            }
            return null; // BDM has no upstream
          };
          const myUpEnd = getUpstreamEnd(order);
          const targetUpEnd = getUpstreamEnd(mO[ni]);
          if (myUpEnd && targetUpEnd && myUpEnd > targetUpEnd) return prev;
        }
        const [moved] = mO.splice(idx,1); mO.splice(ni,0,moved);
        // Update ONLY this machine's sequence (not upstream!)
        mO.forEach((o,i) => { if (!o[lk]) o[sk] = i; });
        // Propagate to DOWNSTREAM sequences only (unlocked)
        const dsk = dragRef.current.downstreamKeys, dlk = dragRef.current.downstreamLocks;
        mO.forEach((o,i) => {
          for (let d = 0; d < dsk.length; d++) {
            if (!o[dlk[d]]) o[dsk[d]] = i;
          }
        });
        dragRef.current.startY = ev.clientY; return next; }); } };
    const onUp = () => { dragRef.current = null; window.removeEventListener("pointermove",onMove); window.removeEventListener("pointerup",onUp); };
    window.addEventListener("pointermove",onMove); window.addEventListener("pointerup",onUp);
  };

  const selOrder = orders.find(o => o.id===selId);
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 20, background: T.sf, padding: "6px 12px", display: "flex", gap: 6, alignItems: "center", borderBottom: `1px solid ${T.bd}` }}>
          <button onClick={() => setZoom(z => Math.max(2,z-5))} style={bSe}>−</button>
          <span style={{ fontSize: 11, color: T.tm, minWidth: 50, textAlign: "center" }}>{zoom}px/h</span>
          <button onClick={() => setZoom(z => Math.min(120,z+5))} style={bSe}>+</button>
          <div style={{ width: 1, height: 16, background: T.bd, margin: "0 4px" }}/>
          <button onClick={scrollToNow} style={{...bSe, fontSize: 11, fontWeight: 600}}>📍 Dnes</button>
          {!ro&&<button onClick={onOpt} style={{...bPr, padding: "5px 12px", fontSize: 12}}>⚡ Optimalizovat</button>}
          {!ro&&<button onClick={() => setShowDtM(true)} style={{...bSe, fontSize: 11}}>+ Odstávka</button>}
        </div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 12, padding: "4px 10px", fontSize: 10, color: T.tm, background: T.alt, borderBottom: `1px solid ${T.bl}`, flexWrap: "wrap" }}>
          <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:14,height:2,background:"#dc2626"}}/>červená = <b>TEĎ</b> (aktuální čas)</span>
          <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:14,height:2,background:"#dc2626"}}/>+ ▼ štítek = <b>termín zakázky</b> (jen na HANG)</span>
          <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:14,height:2,background:"repeating-linear-gradient(90deg,#f59e0b 0,#f59e0b 2px,transparent 2px,transparent 4px)"}}/>oranžová čárkovaná = <b>cíl</b> (den před termínem)</span>
        </div>
        <div style={{ position: "relative", width: MK.length*colW+52, height: totalH*zoom+hdrH+40, background: T.bg }}>
          {/* Column headers */}
          <div style={{ position: "sticky", top: 40, zIndex: 15, display: "flex", background: T.sf, borderBottom: `1px solid ${T.bd}` }}>
            <div style={{ width: 52 }}/>{MK.map(m => <div key={m} style={{ width: colW, padding: "7px 2px", textAlign: "center", fontSize: 11, fontWeight: 700, color: MACHINES[m].color, borderLeft: `1px solid ${T.bd}` }}>{MACHINES[m].label}</div>)}
          </div>
          {/* Day grid */}
          {days.map((d,i) => {
            const y = tY(d)+hdrH, isT = isoD(d)===isoD(now), we = isWE(d), dayH = tY(addD(d,1))-tY(d);
            return (<div key={i}>
              {we && <div style={{ position: "absolute", top: y, left: 52, width: MK.length*colW, height: dayH, background: "#fef2f2", zIndex: 0 }}/>}
              {!we && i%2===0 && <div style={{ position: "absolute", top: y, left: 52, width: MK.length*colW, height: dayH, background: "#f8fafc", zIndex: 0 }}/>}
              <div style={{ position: "absolute", top: y, left: 0, width: "100%", height: 1, background: isT ? T.ac : we ? "#fca5a5" : "#cbd5e1", zIndex: 1 }}/>
              {zoom >= 20 && <div style={{ position: "absolute", top: y+dayH/2, left: 52, width: MK.length*colW, height: 1, background: T.bl, zIndex: 0, opacity: 0.6 }}/>}
              <div style={{ position: "absolute", top: y+2, left: 3, fontSize: 9, fontWeight: isT?700:400, color: isT?T.ac:we?"#dc2626":T.tf, zIndex: 2 }}>{["Ne","Po","Út","St","Čt","Pá","So"][d.getDay()]} {d.getDate()}.{d.getMonth()+1}</div>
              {MK.map((_,mi) => <div key={mi} style={{ position: "absolute", top: y, left: 52+mi*colW, width: 1, height: dayH, background: T.bl, zIndex: 0 }}/>)}
            </div>);
          })}
          {/* Now line */}
          <div style={{ position: "absolute", top: tY(now)+hdrH, left: 0, width: "100%", height: 2, background: "#dc2626", zIndex: 12, pointerEvents: "none" }}><div style={{ position: "absolute", left: 3, top: -8, fontSize: 9, color: "#fff", fontWeight: 700, background: "#dc2626", padding: "1px 6px", borderRadius: 3 }}>⏱ TEĎ ({czDT(now).split(", ")[1] || ""})</div></div>
          {/* Downtimes */}
          {(packed._dts||[]).map((dt,i) => { const mi = MK.indexOf(dt.machine); if (mi<0) return null; const s = dt.start instanceof Date?dt.start:new Date(dt.start), e2 = dt.end instanceof Date?dt.end:new Date(dt.end); const y1 = tY(s)+hdrH, h = tY(e2)-tY(s); if (h<1) return null;
            return <div key={`dt${i}`} style={{ position: "absolute", top: y1, left: 52+mi*colW+1, width: colW-2, height: h, background: "repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 3px,#f3f4f6 3px,#f3f4f6 6px)", borderRadius: 2, opacity: 0.7, zIndex: 2 }}/>;
          })}
          {/* Order bars */}
          {MK.map((m,mi) => (packed[m]||[]).map((p,pi) => {
            const y1 = tY(p.start)+hdrH, h = Math.max(tY(p.end)-tY(p.start),4);
            const isDraft = STATUSES[p.order.status]?.draft, isSel = p.order.id===selId;
            const flags = [p.order.stitek&&"Š",p.order.vpPolep&&"VP",p.order.etiketa&&"E",p.order.etiketaHang&&"EH"].filter(Boolean);
            const mlk = {AP1:"lockAP1",CENTRA:"lockCEN",HANG:"lockHANG"}[m]||"lock";
            const isLk = !!p.order[mlk];
            return (<div key={`${m}_${pi}`}>
              {p.coStart&&p.coMin>0 && <div style={{ position: "absolute", top: tY(p.coStart)+hdrH, left: 52+mi*colW+3, width: colW-6, height: Math.max((p.coMin/60)*zoom,2), background: "#fbbf2444", border: "1px solid #fbbf2466", borderRadius: 2, zIndex: 3 }}/>}
              <div onPointerDown={e => handleDrag(e,p.order,m)} onClick={() => setSelId(p.order.id===selId?null:p.order.id)}
                style={{ position: "absolute", top: y1, left: 52+mi*colW+3, width: colW-6, height: Math.max(h,18),
                  background: p.actEnd?"#16a34a"+"cc":p.wip?"#f59e0b"+"dd":isDraft?MACHINES[m].color+"30":MACHINES[m].color+"dd", borderRadius: 3,
                  cursor: ro?"default":isLk?"not-allowed":"grab", zIndex: 5,
                  border: isSel?`2px solid ${T.tx}`:isLk?`2px solid #dc2626`:`1px solid ${MACHINES[m].color}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "1px 3px",
                  boxShadow: isSel?"0 0 0 2px #fff":"0 1px 2px rgba(0,0,0,.12)",
                    ...(p.actEnd ? {borderBottom: "3px solid #16a34a"} : {}) }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: isDraft?MACHINES[m].color:"#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{isLk?"🔒 ":""}{p.order.customer||p.order.type} {p.order.width}</span>
                {flags.length>0&&h>24 && <span style={{ fontSize: 7, color: isDraft?MACHINES[m].color:"#ffffffbb", marginTop: 1 }}>{flags.join(" ")}</span>}
              </div>
              {!ro && h >= 14 && <div onClick={e => { e.stopPropagation(); upd(p.order.id, {[mlk]: !isLk}); }}
                title={isLk?`Odemknout ${MACHINES[m].label}`:`Zamknout na ${MACHINES[m].label}`}
                style={{ position: "absolute", top: y1+1, left: 52+mi*colW+colW-14, width: 12, height: 12, borderRadius: 2,
                  background: isLk?"#dc2626":"rgba(255,255,255,0.3)", cursor: "pointer", zIndex: 8,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: isLk?"#fff":"#fff8" }}>
                {isLk?"🔒":"🔓"}
              </div>}
              {p.order.deadline&&m==="HANG"&&(()=>{ const dl=pd(p.order.deadline); if(!dl) return null; const target=addD(dl,-1); const lbl=p.order.customer||`#${p.order.id.slice(0,4)}`; return <>
                <div style={{ position: "absolute", top: tY(target)+hdrH-1, left: 52+mi*colW, width: colW, height: 2, background: "repeating-linear-gradient(90deg,#f59e0b 0,#f59e0b 4px,transparent 4px,transparent 8px)", zIndex: 6, pointerEvents: "none" }} title={`Cíl (den před termínem): ${lbl}`}/>
                <div style={{ position: "absolute", top: tY(dl)+hdrH-1, left: 52+mi*colW, width: colW, height: 2, background: "#dc2626", zIndex: 6, pointerEvents: "none" }} title={`Termín: ${lbl} — ${czD(p.order.deadline)}`}/>
                <div style={{ position: "absolute", top: tY(dl)+hdrH-7, left: 52+mi*colW+colW-4, fontSize: 8, color: "#fff", background: "#dc2626", padding: "1px 4px", borderRadius: 2, fontWeight: 600, zIndex: 7, pointerEvents: "none", transform: "translateX(-100%)", whiteSpace: "nowrap", maxWidth: colW-6, overflow: "hidden", textOverflow: "ellipsis" }} title={`Termín: ${lbl}`}>▼ {lbl}</div>
              </>; })()}
            </div>);
          }))}
        </div>
        {showDtM && <DtMod onClose={() => setShowDtM(false)} onAdd={dt => { setDts(p => [...p,dt]); setShowDtM(false); }}/>}
      </div>
      {/* Anchored detail panel — always visible */}
      <div style={{ width: 380, flexShrink: 0, borderLeft: `1px solid ${T.bd}`, background: T.sf, overflowY: "auto", overflowX: "hidden" }}>
        {selOrder
          ? <DetPan order={selOrder} packed={packed} upd={upd} onEdit={() => onEdit(selOrder.id)} onClose={() => setSelId(null)}/>
          : <div style={{ padding: 40, textAlign: "center", color: T.tf, fontSize: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
              Klikni na blok v Ganttu<br/>pro zobrazení detailu
            </div>
        }
      </div>
    </div>
  );
}

function DtMod({ onClose, onAdd }) {
  const [machine,setMachine]=useState("BDM_MRAMOR"),[start,setStart]=useState(""),[end,setEnd]=useState(""),[reason,setReason]=useState("");
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.2)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{...cSt, width: 350, boxShadow: "0 8px 30px rgba(0,0,0,.12)"}}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Nová odstávka</div>
      <label style={lSt}>Stroj</label><select value={machine} onChange={e => setMachine(e.target.value)} style={{...iSt,marginBottom:8}}>{MK.map(m => <option key={m} value={m}>{MACHINES[m].label}</option>)}</select>
      <label style={lSt}>Začátek</label><input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={{...iSt,marginBottom:8}}/>
      <label style={lSt}>Konec</label><input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} style={{...iSt,marginBottom:8}}/>
      <label style={lSt}>Důvod</label><input value={reason} onChange={e => setReason(e.target.value)} style={{...iSt,marginBottom:12}}/>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}><button onClick={onClose} style={bSe}>Zrušit</button><button onClick={() => {if(start&&end)onAdd({id:uid(),machine,start,end,reason});}} style={bPr}>Přidat</button></div>
    </div>
  </div>);
}

function DetPan({ order, packed, upd, onEdit, onClose }) {
  const allPhases = orderPhases(order);
  const phases = allPhases.map(m => { const it = (packed[m]||[]).find(p => p.order.id===order.id); return it?{machine:m,...it}:null; }).filter(Boolean);
  const lockK = {BDM_MRAMOR:"lock",BDM_PP:"lock",AP1:"lockAP1",CENTRA:"lockCEN",HANG:"lockHANG"};
  const startK = {BDM_MRAMOR:"ps",BDM_PP:"ps",AP1:"psAP1",CENTRA:"psCEN",HANG:"psHANG"};
  const togLock = m => { const lk=lockK[m],sk=startK[m],it=phases.find(p => p.machine===m); if(order[lk]) upd(order.id,{[lk]:false,[sk]:""}); else upd(order.id,{[lk]:true,[sk]:it?.start?.toISOString()||""}); };
  const flags = [order.stitek&&"Štítek",order.vpPolep&&"VP Polep",order.etiketa&&"Etiketa",order.etiketaHang&&"Et. HANG"].filter(Boolean);
  return (
    <div style={{ padding: 12, fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{order.customer||`#${order.id.slice(0,4)}`}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.tm, cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
      </div>
      <StatusPills value={order.status} onChange={s => upd(order.id,{status:s})} small/>
      <div style={{ fontSize: 11, color: T.tm, marginTop: 6, marginBottom: 6, lineHeight: 1.5 }}>
        <div><b style={{color:T.tx}}>Typ:</b> {order.type} · <b style={{color:T.tx}}>Šířka:</b> {order.width}mm</div>
        <div><b style={{color:T.tx}}>Množství:</b> {order.qty} ks · <b style={{color:T.tx}}>Termín:</b> {czD(order.deadline)} {isLate(order,packed) && <span style={{background:"#dc2626",color:"#fff",padding:"1px 5px",borderRadius:3,fontSize:9,fontWeight:700,marginLeft:4}}>NESTÍHÁ</span>}</div>
        {order.expL && <div><b style={{color:T.tx}}>EXP.L:</b> {order.expL}</div>}
        <div><b style={{color:T.tx}}>Flow:</b> BDM → AP-1{needsCentra(order)?" → CENTRA":""} → HANG</div>
        {flags.length>0 && <div style={{marginTop:4}}>{flags.map(f => <span key={f} style={{ display: "inline-block", padding: "1px 6px", background: T.al, borderRadius: 3, fontSize: 10, fontWeight: 500, marginRight: 4, color: T.ac }}>{f}</span>)}</div>}
        {order.notes && <div style={{ marginTop: 4, fontStyle: "italic", color: T.tf, fontSize: 11 }}>{order.notes}</div>}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3 }}>Fáze</div>
      {/* Phase pipeline */}
      <div style={{ display: "flex", gap: 1, marginBottom: 4 }}>
        {allPhases.map(m => {
          const done = phaseDone(order, m);
          const planned = phases.some(p => p.machine === m);
          return <div key={m} style={{ flex: 1, textAlign: "center", padding: "3px 2px", borderRadius: 4, fontSize: 9, fontWeight: 600,
            background: done ? "#16a34a" : planned ? MACHINES[m].color+"22" : T.alt,
            color: done ? "#fff" : planned ? MACHINES[m].color : T.tf,
            border: `1px solid ${done ? "#16a34a" : planned ? MACHINES[m].color+"44" : T.bl}` }}>{MACHINES[m].label.replace("BDM ","")}{done && " ✓"}</div>;
        })}
      </div>
      {phases.map(p => {
        const aeK = AE_KEY[p.machine]; const aeVal = order[aeK] || ""; const done = !!aeVal;
        return (
        <div key={p.machine} style={{ padding: "4px 6px", marginBottom: 2, borderRadius: 4, background: done ? "#f0fdf4" : T.alt, border: `1px solid ${done ? "#bbf7d0" : T.bl}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: done ? "#16a34a" : MACHINES[p.machine].color }}>{done ? "✓ " : ""}{MACHINES[p.machine].label}</span>
            <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
              {!done && <button onClick={() => upd(order.id, {[aeK]: new Date().toISOString()})} style={{padding:"1px 5px",fontSize:8,fontWeight:600,background:"#16a34a",color:"#fff",border:"none",borderRadius:3,cursor:"pointer"}}>✓ Hotovo</button>}
              <button onClick={() => togLock(p.machine)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>{order[lockK[p.machine]]?"🔒":"🔓"}</button>
            </div>
          </div>
          <div style={{ fontSize: 9, color: T.tm, marginTop: 1 }}>Plán: {czDT(p.start)} → {czDT(p.end)} {p.coMin>0&&<span style={{color:"#d97706"}}>(CO {p.coMin}m)</span>}</div>
          <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 8, color: T.tf }}>Skut:</span>
            <input type="datetime-local" value={aeVal ? aeVal.slice(0,16) : ""} onChange={e => upd(order.id, {[aeK]: e.target.value ? new Date(e.target.value).toISOString() : ""})}
              style={{ padding: "1px 3px", fontSize: 9, border: `1px solid ${T.bd}`, borderRadius: 3, background: T.bg, color: T.tx, flex: 1 }} />
            {aeVal && <button onClick={() => upd(order.id, {[aeK]: ""})} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:11}}>✕</button>}
          </div>
        </div>);
      })}
      <button onClick={onEdit} style={{...bPr, width: "100%", fontSize: 11, padding: "5px 8px", marginTop: 6}}>Otevřít editor</button>
    </div>
  );
}


/* ═══ TWO-STEP BUTTON ═══ */
function ResetBtn({ onReset, label, color = "#dc2626" }) {
  const [step, setStep] = useState(0);
  useEffect(() => { if (step === 1) { const t = setTimeout(() => setStep(0), 3000); return () => clearTimeout(t); } }, [step]);
  if (step === 0) return <button onClick={() => setStep(1)} style={{...bSe, color}}>{label}</button>;
  return <button onClick={() => { onReset(); setStep(0); }} style={{...bSe, background: color, color: "#fff", borderColor: color}}>Opravdu {label.toLowerCase()}?</button>;
}

/* ═══ SETTINGS ═══ */
function Sett({ settings, setSettings, orders, setOrders, dts, setDts, ro }) {
  const [tab,setTab]=useState("norms");
  const uS = (path,val) => { setSettings(prev => { const n = JSON.parse(JSON.stringify(prev)), k = path.split("."); let o = n; for (let i=0;i<k.length-1;i++){if(!o[k[i]])o[k[i]]={};o=o[k[i]];} o[k[k.length-1]]=val; return n; }); };
  const thS = {padding:"6px 8px",textAlign:"left",borderBottom:`1px solid ${T.bd}`,color:T.tm,fontSize:11};
  const tdS2 = {padding:"6px 8px",borderBottom:`1px solid ${T.bl}`};
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Nastavení</h2>
      <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
        {[["norms","Normy"],["data","Data"]].map(([k,l]) => <button key={k} onClick={() => setTab(k)} style={{ padding: "6px 14px", borderRadius: 5, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", background: tab===k?T.ac:T.sf, color: tab===k?"#fff":T.tm }}>{l}</button>)}
      </div>
      {tab==="norms" && <div style={cSt}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Normy (ks/h)</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr><th style={thS}>Stroj</th>{TYPES.map(t=><th key={t} style={thS}>{t}</th>)}</tr></thead>
            <tbody>
              {BDM_KEYS.map(m=>{const nv=(settings?.norms||DEF.norms)[m];return(
                <tr key={m}><td style={tdS2}><span style={{color:MACHINES[m].color,fontWeight:600}}>{MACHINES[m].label}</span></td>
                  {TYPES.map(t=><td key={t} style={tdS2}><input type="number" value={typeof nv==="object"?pf(nv[t]):pf(nv)} onChange={e=>{const cur=typeof nv==="object"?{...nv}:{"MRAMOR":pf(nv),"PP/PAP":pf(nv),"PP/PP":pf(nv)};cur[t]=pf(e.target.value);uS(`norms.${m}`,cur);}} style={{...iSt,width:80}}/></td>)}</tr>);})}
              {MK.filter(m=>!BDM_KEYS.includes(m)).map(m=><tr key={m}><td style={tdS2}><span style={{color:MACHINES[m].color,fontWeight:600}}>{MACHINES[m].label}</span></td><td colSpan={3} style={tdS2}><input type="number" value={pf((settings?.norms||DEF.norms)[m])} onChange={e=>uS(`norms.${m}`,pf(e.target.value))} style={{...iSt,width:80}}/></td></tr>)}
            </tbody>
          </table>
        </div>}
      {tab==="data" && <div style={cSt}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Data</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => { const blob = new Blob([JSON.stringify({orders,dts,settings},null,2)],{type:"application/json"}); const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`emba-poradace-${isoD(new Date())}.json`; a.click(); }} style={bPr}>Export JSON</button>
          <label style={{...bSe,display:"inline-flex",alignItems:"center",cursor:"pointer"}}>Import JSON<input type="file" accept=".json" style={{display:"none"}} onChange={e => { const f=e.target.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=ev => {try{const d=JSON.parse(ev.target.result);d.orders&&setOrders(d.orders);d.dts&&setDts(d.dts);d.settings&&setSettings({...DEF,...d.settings});}catch{}}; r.readAsText(f); }}/></label>
          <ResetBtn onReset={async () => {setOrders([]);setDts([]);setSettings(DEF);await dbDelete(DATA_KEY);}} label="Smazat vše"/>
            <ResetBtn onReset={() => setOrders(SAMPLE.map(o => ({...o})))} label="Načíst vzorová data" color="#2563eb"/>
        </div>
        {dts.length>0 && <div style={{marginTop:14}}><div style={{fontSize:12,fontWeight:600,marginBottom:4}}>Manuální odstávky</div>
          {dts.map(d => <div key={d.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:T.alt,borderRadius:4,fontSize:11,marginBottom:2,border:`1px solid ${T.bl}`}}>
            <span style={{fontWeight:600,color:MACHINES[d.machine]?.color}}>{MACHINES[d.machine]?.label}</span>
            <span style={{color:T.tm}}>{czDT(d.start)} → {czDT(d.end)}</span><span style={{color:T.tf}}>{d.reason}</span><div style={{flex:1}}/>
            <button onClick={() => setDts(p => p.filter(x => x.id!==d.id))} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer"}}>✕</button></div>)}</div>}
      </div>}
    </div>
  );
}


