import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import type { GameRecord } from "./coach";
import { normalizeDifficulty, placementLevel, placementTasks, recommendDifficulty } from "./difficulty.ts";
function game(index: number, levelIndex = 1, loss = 0, result = "You win — checkmate"): GameRecord {
  const g = new Chess();
  const moves = ["e4","e5","Nf3","Nc6","Bc4","Bc5","d3","Nf6","O-O","O-O","Nc3","d6","Be3","Be6","Qd2","Qd7"].map((san,i)=>{
    const m=g.move(san); return {san:m.san,piece:m.piece,from:m.from,to:m.to,ply:i+1,loss};
  }).filter((m)=>m.ply%2===1);
  return {id:`game-${index}`,date:new Date(Date.UTC(2026,8,index+1)).toISOString(),difficultyMode:"adaptive",levelIndex,level:"Casual",color:"w",result,pgn:g.pgn(),moves};
}
test("placement positions are legal and start with the intended side", () => {
  for(const task of placementTasks) { const g=new Chess(task.fen); assert.equal(g.turn(),"w"); assert.ok(g.moves().length>1); assert.equal(g.isGameOver(),false); }
});
test("placement handles skips and caps claims from a short sample", () => {
  assert.equal(placementLevel([null,null,null]),0);
  assert.equal(placementLevel([20,200,null]),1);
  assert.equal(placementLevel([0,0,0]),2);
  assert.throws(()=>placementLevel([0]));
  assert.deepEqual(normalizeDifficulty({adaptive:false,placement:{level:99}}),{adaptive:false});
});
test("adaptation requires three sufficiently long adaptive games at the current level", () => {
  assert.equal(recommendDifficulty([game(0),game(1)]).level,1);
  assert.equal(recommendDifficulty([game(0),game(1),{...game(2),moves:game(2).moves.slice(0,7)}]).level,1);
  assert.equal(recommendDifficulty([game(0),game(1),{...game(2),difficultyMode:"manual"}]).level,1);
  assert.equal(recommendDifficulty([game(0),game(1),game(2,2)]).level,1);
});
test("wins with few costly moves raise one level, with no duplicate adjustment on reload", () => {
  const records=[game(0),game(1),game(2)];
  assert.equal(recommendDifficulty(records).level,2);
  assert.deepEqual(recommendDifficulty(records),recommendDifficulty([...records,records[0]]));
  assert.equal(recommendDifficulty([...records,game(3,2),game(4,2),game(5,2)]).level,3);
});
test("frequent costly moves plus losses lower difficulty, but losses alone do not", () => {
  assert.equal(recommendDifficulty([0,1,2].map((i)=>game(i,1,200,"Resigned"))).level,0);
  assert.equal(recommendDifficulty([0,1,2].map((i)=>game(i,1,0,"Resigned"))).level,1);
});
test("placement resets the baseline and excludes prior games", () => {
  const placement={level:0,losses:[null,null,null],completedAt:"2026-09-05T00:00:00Z"};
  const result=recommendDifficulty([game(0),game(1),game(2)],placement);
  assert.equal(result.level,0);
  assert.equal(result.qualifyingGames,0);
});
test("manual preference survives normalization and level bounds hold", () => {
  assert.deepEqual(normalizeDifficulty({adaptive:false,manualLevel:3}),{adaptive:false,manualLevel:3});
  const losses=[0,1,2,3,4,5].map((i)=>game(i,i<3?1:0,200,"Resigned"));
  assert.equal(recommendDifficulty(losses).level,0);
  const wins=Array.from({length:18},(_,i)=>game(i,Math.min(5,1+Math.floor(i/3))));
  assert.equal(recommendDifficulty(wins).level,5);
});
