'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Organism,Predictor}=require('../web/core.js');
const {clone,advance,evaluate,measure}=require('./measure.cjs');
test('A learned self-response predicts future pings, and copy removal destroys cancellation',()=>{
  for(const seed of [7,42,731]){
    const r=measure(seed);
    assert.ok(r.held_out.explained>.98,JSON.stringify(r));
    assert.ok(Math.abs(r.copy_removed.explained)<1e-12);
    assert.ok(r.reflector_changed_frozen.residual_mse>r.held_out.residual_mse*10);
    assert.ok(r.reflector_relearned.residual_mse<r.reflector_changed_frozen.residual_mse*.1);
    assert.ok(r.one_band_disturbance.peak_residual_rms>r.held_out.peak_residual_rms*10);
  }
});
test('Changing only one external frequency band leaves other learned channels exactly unchanged',()=>{
  const a=new Organism(42);a.roam=false;advance(a,1800);const b=clone(a);b.disturb(.9,.5,1,1.8);
  let targetDifference=0;
  for(let t=0;t<180;t++){a.step();b.step();for(const band of [0,2])for(let e=0;e<4;e++){const j=band*4+e;assert.equal(a.observed[j],b.observed[j]);assert.deepEqual(a.predictor.weights[j],b.predictor.weights[j]);}targetDifference+=Math.abs(a.residual[4]-b.residual[4]);}
  assert.ok(targetDifference>1);
});
test('Snapshots resume exactly through pending echoes and active movement',()=>{
  const a=new Organism(19);advance(a,1300);a.disturb(.92,.5,1,1.6);advance(a,15);a.ping(2);
  const b=clone(a);
  for(let t=0;t<420;t++){a.step();b.step();assert.deepEqual(a.observed,b.observed);assert.deepEqual(a.predicted,b.predicted);}
  assert.deepEqual(a.snapshot(),b.snapshot());
});
test('Freezing learning preserves all coefficients while returns still change',()=>{
  const a=new Organism(101);a.roam=false;advance(a,1000);a.learning=false;const weights=a.predictor.toJSON().weights;
  a.disturb(.8,.5,0,2);advance(a,250);assert.deepEqual(a.predictor.toJSON().weights,weights);
});
test('Prediction uses the outgoing command before the current observation',()=>{
  const p=new Predictor();const before=Array.from(p.predict([1,0,0]));assert.deepEqual(before,new Array(12).fill(0));
  const observed=new Float64Array(12).fill(.2);p.observe(observed);assert.deepEqual(Array.from(p.predicted),before);
  assert.ok(p.weights[0][0]>0);assert.equal(p.weights[4][0],0);assert.equal(p.weights[8][0],0);
});
test('Invalid memories are rejected before replacing a running model',()=>{
  const a=new Organism(),s=a.snapshot();s.predictor.weights[0][0]=NaN;assert.throws(()=>Organism.restore(s));
  const bad=a.snapshot();bad.world.events=[{x:.5,y:.5,band:99,t:0,amp:1}];assert.throws(()=>Organism.restore(bad));
});
test('Long running moving organisms keep finite, bounded state and a bounded event queue',()=>{
  const o=new Organism(73);for(let t=0;t<6500;t++){if(t%400===0)o.disturb(.9,.35,(t/400)%3|0,1.6);o.step();assert.ok(Number.isFinite(o.surprise));assert.ok(o.world.events.length<200);assert.ok(o.world.body.x>=.13&&o.world.body.x<=1.37);}
  assert.ok(o.lastMove>900,'The residual actually caused movement');
  assert.ok(o.predictor.weights.every(w=>w.every(Number.isFinite)));
});
