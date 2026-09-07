/* The drawing reads the simulation. It does not supply its prediction or surprise. */
'use strict';
const $=id=>document.getElementById(id), {clamp,COLORS,SPEED}=Jello;
let organism=new Jello.Organism(),room=new RoomEar(),mode='pond',paused=false,simSpeed=2;
let selectedBand=1,drag=null,noticeTimer,recording=null,recordTimer=null;
const canvas=$('pond'),ctx=canvas.getContext('2d'),trace=$('trace'),tc=trace.getContext('2d'),phase=$('phase'),pc=phase.getContext('2d');
let W=1000,H=800,DPR=1,scale=600,ox=50,oy=90,visualTick=0;
const starRng=new Jello.Random(121);
const dust=Array.from({length:130},()=>({x:starRng.next(),y:starRng.next(),r:.3+starRng.next()*1.2,z:starRng.next()}));
const bandNames=['Low','Middle','High'];
$('bandRows').innerHTML=bandNames.map((name,b)=>`<div class="band-row"><span style="color:${COLORS[b]}">${name}</span><div class="band-meter" style="--c:${COLORS[b]}"><i id="bandMeter${b}"></i></div><output id="bandValue${b}">0.00</output></div>`).join('');
function notify(text){$('notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').textContent='',5000);}
function resize(){const r=canvas.getBoundingClientRect();W=r.width;H=r.height;DPR=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);scale=Math.min((W-36)/1.5,H-220);ox=(W-1.5*scale)/2;oy=(H-scale)/2+12;for(const c of [trace,phase]){const q=c.getBoundingClientRect();c.width=Math.round(q.width*DPR);c.height=Math.round(q.height*DPR);}}
new ResizeObserver(resize).observe(canvas.parentElement);
function xy(x,y){return [ox+x*scale,oy+y*scale];}
function line(points,color,width=1){if(points.length<2)return;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function circle(x,y,r,color,width=1){if(r<=0)return;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function drawPond(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
  const bg=ctx.createRadialGradient(W*.45,H*.48,0,W*.5,H*.5,Math.max(W,H)*.75);bg.addColorStop(0,'#0d2b36');bg.addColorStop(.65,'#091c27');bg.addColorStop(1,'#061019');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  for(const p of dust){const x=p.x*W+Math.sin(visualTick*.002+p.y*15)*5,y=p.y*H;ctx.fillStyle=`rgba(153,216,218,${.06+p.z*.13})`;ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();}
  if(mode==='pond'){
    // Analytic ray wavefronts: positions, ages and strengths come from the same
    // events sampled by the four sensors. Rings are a readable envelope rendering.
    const w=organism.world;
    for(const ev of w.events){const age=w.tick-ev.t;if(age<=0||age>85)continue;const [x,y]=xy(ev.x,ev.y),r=age*SPEED*scale;
      const alpha=clamp(Math.abs(ev.amp)*.36*(1-age/100),0,.45);
      ctx.globalAlpha=alpha;circle(x,y,r,ev.self?COLORS[ev.band]:'#ffc786',ev.reflected?.7:1.3);
      if(r>8){ctx.globalAlpha=alpha*.35;circle(x,y,r-7,ev.self?COLORS[ev.band]:'#ffc786',2);}
    }ctx.globalAlpha=1;
    for(let i=0;i<w.reflectors.length;i++)drawStone(w.reflectors[i],i);
    line(organism.path.map(p=>xy(p.x,p.y)),'#73c9b820',1);
  }else{
    const [x,y]=xy(.75,.54);for(let i=0;i<5;i++)circle(x,y,(.15+i*.13)*scale,'#668fa015',1);
    if(room.running){for(let i=0;i<3;i++){const age=(room.tick-i*30)%90;if(age>0){ctx.globalAlpha=.25*(1-age/90);circle(x,y,(.06+age*.012)*scale,COLORS[(room.pings-i+6)%3],1);}}ctx.globalAlpha=1;}
    ctx.fillStyle='#94b6c7';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(room.running?'MICROPHONE → THREE ENERGY BANDS':'YOUR ROOM WILL BECOME THE WORLD',x,oy+scale*.94);
  }
  drawBody();
}
function drawStone(r,i){
  const [x,y]=xy(r.x,r.y),rad=r.r*scale;
  const glow=ctx.createRadialGradient(x,y,rad*.3,x,y,rad*2.5);glow.addColorStop(0,'#a6b7bc12');glow.addColorStop(1,'#9ccddd00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,rad*2.5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();for(let k=0;k<=60;k++){const a=k/60*Math.PI*2,rr=rad*(1+.1*Math.sin(a*3+i)+.065*Math.cos(a*5+i));const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*.8;k?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();
  const gr=ctx.createLinearGradient(x-rad,y-rad,x+rad,y+rad);gr.addColorStop(0,'#617777');gr.addColorStop(.45,'#304d54');gr.addColorStop(1,'#102c38');ctx.fillStyle=gr;ctx.fill();ctx.strokeStyle=drag===i?'#d5e9d6':'#78928d88';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='#bed4cd';ctx.textAlign='center';ctx.font='11px system-ui';ctx.fillText(String(i+1).padStart(2,'0'),x,y+4);
}
function data(){return mode==='pond'?organism:room;}
function drawBody(){
  const d=data(),p=mode==='pond'?organism.world.body:{x:.75,y:.54};const [cx,cy]=xy(p.x,p.y);
  const base=clamp(scale*.119,32,108),surprise=clamp(d.surprise*5,0,1),t=mode==='pond'?organism.world.tick:room.tick;
  const model=mode==='pond'?organism.predictor:room.model,ears=model.ears;
  const obs=d.observed,err=d.residual;
  const halo=ctx.createRadialGradient(cx,cy,base*.35,cx,cy,base*2.7);halo.addColorStop(0,`rgba(103,245,204,${.1+surprise*.08})`);halo.addColorStop(.4,`rgba(99,203,206,${.05+surprise*.03})`);halo.addColorStop(1,'#50deb500');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(cx,cy,base*2.7,0,Math.PI*2);ctx.fill();
  const points=[];
  for(let i=0;i<160;i++){const a=i/160*Math.PI*2;let activity=0;for(let e=0;e<ears;e++){const theta=e/ears*Math.PI*2;let f=0;for(let b=0;b<3;b++)f+=Math.abs(obs[b*ears+e]||0);activity+=f*Math.exp((Math.cos(a-theta)-1)*7);}
    const r=base*(1+.075*Math.sin(3*a+t*.013)+.06*Math.sin(5*a-t*.011)+.035*Math.cos(9*a+t*.018)+activity*.22+surprise*.08*Math.sin(7*a));points.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}
  ctx.save();ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();
  const fill=ctx.createRadialGradient(cx-base*.3,cy-base*.4,0,cx,cy,base*1.4);fill.addColorStop(0,'#71e3c52d');fill.addColorStop(.55,'#327f932e');fill.addColorStop(.85,'#60e5c354');fill.addColorStop(1,'#bcffe245');ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=`rgba(${Math.round(119+surprise*130)},${Math.round(234-surprise*40)},${Math.round(210-surprise*70)},.78)`;ctx.lineWidth=1.4;ctx.shadowColor='#64f8d5';ctx.shadowBlur=10;ctx.stroke();ctx.shadowBlur=0;ctx.clip();
  // Every drawn fibre corresponds to one learned impulse-response coefficient.
  ctx.globalCompositeOperation='screen';
  for(let b=0;b<3;b++)for(let k=2;k<90;k+=3){
    let weight=0,act=0;for(let e=0;e<ears;e++){weight+=model.weights[b*ears+e][k]/ears;act+=Math.abs(d.predicted[b*ears+e]||0)/ears;}
    const a=k*.41+b*2.09,rad=base*(.18+.67*k/90),x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad;
    const alpha=clamp(.07+Math.abs(weight)*1.6+act*.5,.07,.7);ctx.globalAlpha=alpha;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(b*2.09)*base*.13,cy+Math.sin(b*2.09)*base*.13);ctx.bezierCurveTo(cx+Math.cos(a+1.4)*rad*.75,cy+Math.sin(a+1.4)*rad*.75,cx+Math.cos(a-.3)*rad*.7,cy+Math.sin(a-.3)*rad*.7,x,y);ctx.strokeStyle=COLORS[b];ctx.lineWidth=.55+Math.abs(weight)*3;ctx.stroke();
    const u=(t*.024+k*.117)%1,px=cx+(x-cx)*u,py=cy+(y-cy)*u;ctx.fillStyle=COLORS[b];ctx.beginPath();ctx.arc(px,py,.6+clamp(act*4,0,2),0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  const amber=ctx.createRadialGradient(cx+base*.13,cy,0,cx+base*.13,cy,base*.55);amber.addColorStop(0,`rgba(255,207,129,${.15+surprise*.7})`);amber.addColorStop(1,'#ffc78100');ctx.fillStyle=amber;ctx.beginPath();ctx.arc(cx,cy,base*.7,0,Math.PI*2);ctx.fill();
  for(let b=0;b<3;b++){const a=b*2.094+t*.002,r=base*.2,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;ctx.globalAlpha=.6;circle(x,y,base*(.1+Math.abs(obs[b*ears]||0)*.11),COLORS[b],1.2);}
  ctx.restore();ctx.globalAlpha=1;
  // Four sensors: amber intensity is actual local prediction error.
  for(let e=0;e<4;e++){const a=e*Math.PI/2,x=cx+Math.cos(a)*base*1.12,y=cy+Math.sin(a)*base*1.12;let er=0;for(let b=0;b<3;b++)er+=Math.abs(err[b*ears+(e%ears)]||0);
    ctx.fillStyle=er>.04?'#ffcf91':'#aefbe1';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7+er*15;ctx.beginPath();ctx.arc(x,y,2+clamp(er*6,0,4),0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
  ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillStyle='#9fc5c5';ctx.fillText(mode==='pond'?'FOUR LOCAL SENSORS':'ONE MICROPHONE',cx,cy+base*1.6);
}
function selectedHistory(h){return h.map(p=>({...p,y:p.ys?.[selectedBand]??p.y,p:p.ps?.[selectedBand]??p.p,r:p.rs?.[selectedBand]??p.r}));}
function charts(){
  const d=data(),h=selectedHistory(d.history.slice(-190)),w=trace.width/DPR,hh=trace.height/DPR;
  tc.setTransform(DPR,0,0,DPR,0,0);tc.clearRect(0,0,w,hh);
  const max=Math.max(.12,...h.flatMap(p=>[Math.abs(p.y),Math.abs(p.p)]));
  for(const y of [hh*.33,hh*.8]){tc.strokeStyle='#2b404b';tc.lineWidth=.6;tc.beginPath();tc.moveTo(0,y);tc.lineTo(w,y);tc.stroke();}
  for(const [key,color,y,amp] of [['y','#72edcf',hh*.33,hh*.27],['p','#c7bcff',hh*.33,hh*.27],['r','#ffc786',hh*.8,hh*.16]]){
    tc.beginPath();h.forEach((p,i)=>{const x=i/190*w,yy=y-p[key]/max*amp;i?tc.lineTo(x,yy):tc.moveTo(x,yy);});tc.strokeStyle=color;tc.lineWidth=key==='p'?1:1.4;tc.setLineDash(key==='p'?[3,3]:[]);tc.stroke();}tc.setLineDash([]);
  const pw=phase.width/DPR,ph=phase.height/DPR;pc.setTransform(DPR,0,0,DPR,0,0);pc.clearRect(0,0,pw,ph);
  const a=visualTick*.0008;pc.strokeStyle='#26434f';pc.lineWidth=.6;pc.beginPath();pc.moveTo(pw*.1,ph*.5);pc.lineTo(pw*.9,ph*.5);pc.moveTo(pw*.5,ph*.1);pc.lineTo(pw*.5,ph*.9);pc.stroke();
  const hist=selectedHistory(d.history.slice(-300));pc.beginPath();for(let i=16;i<hist.length;i++){const x=hist[i].y/max,z=hist[i-16].y/max,y=hist[i-8].y/max,px=pw*.5+(x*Math.cos(a)+z*Math.sin(a))*pw*.35,py=ph*.5+(y*.8+z*.25)*ph*.39;i===16?pc.moveTo(px,py):pc.lineTo(px,py);}pc.strokeStyle=COLORS[selectedBand];pc.lineWidth=.8;pc.stroke();
}
function updateUI(){
  const d=data(),fit=Math.round(d.fit*100);$('state').textContent=d.status;$('fit').innerHTML=`${fit}<span>%</span>`;$('fitBar').style.width=fit+'%';$('fitLabel').textContent=!d.copy?'COPY OFF':!d.learning?'FROZEN':fit>95?'FAMILIAR':'ADAPTING';$('signalBand').textContent=bandNames[selectedBand].toUpperCase()+' BAND';
  $('pingCount').textContent=d.pings+' pings sent';const sec=Math.floor((mode==='pond'?organism.world.tick:room.tick)/30);$('age').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  for(let b=0;b<3;b++){const r=Math.sqrt(d.mismatch[b]);$('bandMeter'+b).style.width=clamp(r*500,0,100)+'%';$('bandValue'+b).textContent=r.toFixed(2);}
  $('narration').textContent=mode==='room'?room.running?(room.tick<60?'First, the sound of the room without a ping.':'The speaker sends a pulse. The microphone brings it back.'):'Connect the microphone when you are ready.':!organism.copy?'Its own pulse now arrives without an explanation.':organism.motion?'The mismatch changed its movement. Now the echo must be learned again.':organism.fit>.95?'The familiar part fades. Something new can stand out.':'The violet prediction is learning to follow the return.';
  charts();
}
let last=performance.now(),acc=0,lastUI=0,lastRoom=0;
function frame(now){const dt=Math.min((now-last)/1000,.1);last=now;
  if(!paused && !document.hidden){
    if(mode==='pond'){acc+=dt*30*simSpeed;let n=0;while(acc>=1&&n<16){organism.step();acc--;n++;}}
    else if(room.running && now-lastRoom>=1000/30){room.step();lastRoom=now;}
    visualTick+=dt*30;
  }
  drawPond();if(now-lastUI>100){updateUI();lastUI=now;}requestAnimationFrame(frame);
}
function syncControls(){const d=data();$('copy').checked=d.copy;$('learn').checked=d.learning;$('roam').checked=organism.roam;$('volume').value=room.volume;}
function changeMode(next){if(next===mode)return;room.stop();$('connectMic').disabled=false;$('stopMic').disabled=true;mode=next;paused=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause simulation');$('pondTab').classList.toggle('active',next==='pond');$('roomTab').classList.toggle('active',next==='room');$('pondTab').setAttribute('aria-pressed',String(next==='pond'));$('roomTab').setAttribute('aria-pressed',String(next==='room'));$('roomControls').hidden=next!=='room';$('roamRow').hidden=next==='room';for(const id of ['disturb','shift','ping'])$(id).hidden=next==='room';$('speed').parentElement.hidden=next==='room';$('pondHint').textContent=next==='pond'?'Click the water to surprise it. Drag a stone to change its world.':'Quiet pings. Local listening. Speak or clap after it learns your room.';$('worldLabel').textContent=next==='pond'?'A PRIVATE INTERIOR / AN OPEN WORLD':'THE SAME LOOP / A REAL RETURN';syncControls();resize();}
$('pondTab').onclick=()=>changeMode('pond');$('roomTab').onclick=()=>changeMode('room');
$('copy').onchange=e=>data().copy=e.target.checked;$('learn').onchange=e=>data().learning=e.target.checked;$('roam').onchange=e=>organism.roam=e.target.checked;
$('speed').onchange=e=>simSpeed=Number(e.target.value);$('band').onchange=e=>selectedBand=Number(e.target.value);
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');if(paused&&mode==='room'){room.stop();$('connectMic').disabled=false;$('stopMic').disabled=true;notify('Microphone and speaker stopped.');}};
$('ping').onclick=()=>{if(paused){notify('Resume to let the signal travel.');return;}organism.ping(selectedBand);};
$('disturb').onclick=()=>organism.disturb(clamp(organism.world.body.x+.24,.06,1.44),clamp(organism.world.body.y-.09,.06,.94),selectedBand,1.6);
$('shift').onclick=()=>{const r=organism.world.reflectors[1];r.y=r.y<.5?.67:.3;notify('The reflector moved. The prediction has not been told.');};
function pointerPos(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-ox)/scale,y:(e.clientY-r.top-oy)/scale};}
canvas.onpointerdown=e=>{if(mode!=='pond')return;const p=pointerPos(e);drag=organism.world.reflectors.findIndex(r=>Math.hypot(p.x-r.x,p.y-r.y)<r.r*1.6);if(drag>=0)canvas.setPointerCapture(e.pointerId);else{drag=null;if(p.x>=0&&p.x<=1.5&&p.y>=0&&p.y<=1)organism.disturb(p.x,p.y,selectedBand,1.6);}};
canvas.onpointermove=e=>{if(drag===null)return;const p=pointerPos(e),r=organism.world.reflectors[drag];r.x=clamp(p.x,.06,1.44);r.y=clamp(p.y,.06,.94);};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
function download(content,name,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('save').onclick=()=>{const s=mode==='pond'?organism.snapshot():room.snapshot();download(JSON.stringify(s),'thinkingjello-'+mode+'-'+new Date().toISOString().slice(0,19).replace(/:/g,'-')+'.json');notify('Memory saved. You can bring this organism back.');};
$('load').onclick=()=>$('loadFile').click();$('loadFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>3e6)throw Error('Memory files must be smaller than 3 MB.');const s=JSON.parse(await file.text());if(s.schema==='thinkingjello/room-1'){const restored=RoomEar.restore(s);room.stop();room=restored;changeMode('room');notify('Room weights restored. Reconnect to recalibrate the quiet baseline.');}else{const restored=Jello.Organism.restore(s);changeMode('pond');organism=restored;notify('The organism and its travelling signals are restored.');}syncControls();}catch(err){notify(err.message);}e.target.value='';};
$('reset').onclick=()=>{if(mode==='pond')organism=new Jello.Organism((Date.now()>>>0)%100000);else{room.stop();room=new RoomEar();$('connectMic').disabled=false;$('stopMic').disabled=true;}syncControls();notify('A new organism, with no learned echoes.');};
function cinema(on){document.body.classList.toggle('cinema',on);requestAnimationFrame(resize);}
$('cinema').onclick=()=>cinema(true);$('exitCinema').onclick=()=>cinema(false);document.addEventListener('keydown',e=>{if(e.key==='Escape')cinema(false);});
$('about').onclick=()=>$('aboutDialog').showModal();$('closeAbout').onclick=()=>$('aboutDialog').close();$('aboutDialog').addEventListener('click',e=>{if(e.target===$('aboutDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
function stopRecord(){if(recording&&recording.state==='recording')recording.stop();clearTimeout(recordTimer);}
$('record').onclick=()=>{if(recording){stopRecord();return;}if(!canvas.captureStream||!window.MediaRecorder){notify('Canvas recording is unavailable in this browser.');return;}try{const stream=canvas.captureStream(30),chunks=[];const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime){stream.getTracks().forEach(t=>t.stop());throw Error('No supported video format.');}recording=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000});recording.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recording.onstop=()=>{download(new Blob(chunks,{type:mime}),'thinkingjello-'+Date.now()+(mime.includes('mp4')?'.mp4':'.webm'),mime);stream.getTracks().forEach(t=>t.stop());recording=null;$('record').textContent='Record 20 s';notify('Silent video saved from the actual canvas.');};recording.start();$('record').textContent='Stop recording';notify('Recording 20 seconds of the organism. Video is silent.');recordTimer=setTimeout(stopRecord,20000);}catch(e){recording=null;notify(e.message);}};
$('connectMic').onclick=async()=>{const button=$('connectMic');button.disabled=true;$('micStatus').textContent='Requesting microphone access…';paused=false;$('pause').textContent='Ⅱ';try{const ok=await room.start($('micDevice').value);if(!ok){button.disabled=false;return;}if(mode!=='room'){room.stop();button.disabled=false;return;}$('stopMic').disabled=false;$('micStatus').textContent='Listening locally. Two quiet seconds, then one low-volume ping per second. No audio is uploaded.';const devices=await navigator.mediaDevices.enumerateDevices();const old=$('micDevice').value;$('micDevice').replaceChildren(new Option('System default',''),...devices.filter(d=>d.kind==='audioinput').map((d,i)=>new Option(d.label||'Input '+(i+1),d.deviceId)));$('micDevice').value=old;}catch(e){button.disabled=false;$('micStatus').textContent=e.name==='NotAllowedError'?'Microphone access was declined. The echo pond still works.':e.message;}};
$('stopMic').onclick=()=>{room.stop();$('connectMic').disabled=false;$('stopMic').disabled=true;$('micStatus').textContent='Microphone and speaker stopped. The learned model remains.';};
$('micDevice').onchange=()=>{if(room.running){room.stop();$('connectMic').disabled=false;$('stopMic').disabled=true;$('micStatus').textContent='Input changed. Reconnect when ready.';}};$('volume').oninput=e=>room.volume=Number(e.target.value);
function autoSave(){try{localStorage.setItem('thinkingjello-memory-v1',JSON.stringify(organism.snapshot()));$('saveStatus').textContent='SAVED HERE';}catch{$('saveStatus').textContent='USE SAVE';}}
try{const saved=localStorage.getItem('thinkingjello-memory-v1');if(saved){organism=Jello.Organism.restore(JSON.parse(saved));notify('Your previous organism is back.');}}catch{notify('Could not restore the previous auto-save. Starting a new organism.');}
setInterval(autoSave,15000);window.addEventListener('pagehide',()=>{autoSave();room.stop();stopRecord();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){autoSave();if(room.running){room.stop();$('connectMic').disabled=false;$('stopMic').disabled=true;$('micStatus').textContent='Stopped when the tab was hidden. Reconnect to listen again.';}}last=performance.now();acc=0;});
// Read-only state access for reproducible diagnostics; UI actions use the same object.
window.thinkingJello={get organism(){return organism;},get room(){return room;}};
syncControls();resize();requestAnimationFrame(frame);
