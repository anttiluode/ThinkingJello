'use strict';
const {Organism}=require('../web/core.js');
const clone=o=>Organism.restore(JSON.parse(JSON.stringify(o.snapshot())));
function advance(o,n){for(let i=0;i<n;i++)o.step();}
function evaluate(o,n=360){let raw=0,error=0,peak=0;const bands=[0,0,0];for(let i=0;i<n;i++){o.step();let rr=0;for(let j=0;j<12;j++){raw+=o.observed[j]**2;error+=o.residual[j]**2;rr+=o.residual[j]**2/12;bands[Math.floor(j/4)]+=o.residual[j]**2/(4*n);}peak=Math.max(peak,Math.sqrt(rr));}return {raw_mse:raw/(12*n),residual_mse:error/(12*n),explained:1-error/raw,peak_residual_rms:peak,band_residual_mse:bands};}
function measure(seed){
  const trained=new Organism(seed);trained.roam=false;advance(trained,1800);trained.learning=false;
  const normal=clone(trained),noCopy=clone(trained);noCopy.copy=false;
  const control=evaluate(normal),without=evaluate(noCopy);
  const noise=clone(trained);noise.disturb(.91,.48,1,1.6);const injected=evaluate(noise,180);
  const moved=clone(trained);moved.world.reflectors[1].y=.67;advance(moved,150);const changed=evaluate(moved,300);
  moved.learning=true;advance(moved,1400);moved.learning=false;const repaired=evaluate(moved);
  return {seed,held_out:control,copy_removed:without,one_band_disturbance:injected,reflector_changed_frozen:changed,reflector_relearned:repaired};
}
module.exports={clone,advance,evaluate,measure};
if(require.main===module){
  const rows=[7,19,42,73,101,731].map(measure);
  const receipt={schema:'thinkingjello/measurement-1',scope:'Same numerical engine as the browser. Stationary body; 1800 learning steps, then frozen prediction on future randomized pings. Fixed geometry; seeds vary commands and observation noise. No hardware validation.',protocol:{seeds:rows.map(r=>r.seed),training_ticks:1800,held_out_ticks:360,disturbance_band:1,reflector_relearning_ticks:1400},rows};
  console.log(JSON.stringify(receipt,null,2));
}
