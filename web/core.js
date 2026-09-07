/* ThinkingJello's complete dependency-free numerical engine. Browser and tests share it. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Jello = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const BANDS = 3, EARS = 4, TAPS = 192, SPEED = .028;
  const COLORS = ['#72edcf', '#ac9fff', '#ffd18c'];
  const OMEGA = [.32, .65, 1.05];
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  class Random {
    constructor(seed=731) { this.state = seed >>> 0 || 1; }
    next() { let t = this.state += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15,t|1); t ^= t + Math.imul(t ^ t >>> 7,t|61); this.state >>>= 0; return ((t ^ t >>> 14) >>> 0)/4294967296; }
  }
  // Only the actual outgoing command enters this temporal bank. No world state,
  // event labels, reflector coordinates or future observations are accessible here.
  class Predictor {
    constructor(taps=TAPS, ears=EARS) {
      this.taps=taps; this.ears=ears; this.head=0; this.updates=0;
      this.history=Array.from({length:BANDS},()=>new Float64Array(taps));
      this.weights=Array.from({length:BANDS*ears},()=>new Float64Array(taps));
      this.predicted=new Float64Array(BANDS*ears); this.error=new Float64Array(BANDS*ears);
      this.features=Array.from({length:BANDS},()=>new Float64Array(taps));
    }
    predict(command, copy=true) {
      this.head=(this.head+1)%this.taps;
      for(let b=0;b<BANDS;b++) {
        this.history[b][this.head]=command[b];
        const x=this.features[b];
        for(let k=0;k<this.taps;k++) x[k]=copy ? this.history[b][(this.head-k+this.taps)%this.taps] : 0;
        for(let e=0;e<this.ears;e++) {
          const w=this.weights[b*this.ears+e]; let sum=0;
          for(let k=0;k<this.taps;k++) sum+=w[k]*x[k];
          this.predicted[b*this.ears+e]=sum;
        }
      }
      return this.predicted;
    }
    observe(observed, learn=true, rate=.65) {
      for(let b=0;b<BANDS;b++) {
        const x=this.features[b]; let norm=.08;
        for(let k=0;k<this.taps;k++) norm+=x[k]*x[k];
        for(let e=0;e<this.ears;e++) {
          const j=b*this.ears+e, err=observed[j]-this.predicted[j]; this.error[j]=err;
          if(learn && Math.abs(err)>.0005) {
            const step=rate*clamp(err,-.35,.35)/norm, w=this.weights[j];
            for(let k=0;k<this.taps;k++) w[k]+=step*x[k];
          }
        }
      }
      if(learn) this.updates++;
      return this.error;
    }
    toJSON() { return {taps:this.taps,ears:this.ears,head:this.head,updates:this.updates,history:this.history.map(r=>Array.from(r)),weights:this.weights.map(r=>Array.from(r))}; }
    static fromJSON(data) {
      if(!data || data.taps!==TAPS || ![1,EARS].includes(data.ears) || !Number.isInteger(data.head) || data.head<0 || data.head>=TAPS || !Number.isFinite(data.updates) || data.updates<0) throw Error('Unsupported memory format.');
      const p=new Predictor(data.taps,data.ears);
      const valid=(rows,n,bound)=>Array.isArray(rows)&&rows.length===n&&rows.every(r=>Array.isArray(r)&&r.length===TAPS&&r.every(v=>Number.isFinite(v)&&Math.abs(v)<=bound));
      if(!valid(data.history,BANDS,10)||!valid(data.weights,BANDS*data.ears,100)) throw Error('The memory contains invalid values.');
      p.history=data.history.map(r=>Float64Array.from(r)); p.weights=data.weights.map(r=>Float64Array.from(r)); p.head=data.head; p.updates=data.updates; return p;
    }
  }
  function kernel(age,band) { return age<0 || age>46 ? 0 : Math.exp(-age/9)*Math.sin(OMEGA[band]*age); }
  class Pond {
    constructor(seed=731) {
      this.rng=new Random(seed); this.tick=0; this.events=[];
      this.body={x:.68,y:.54,vx:0,vy:0};
      this.reflectors=[{x:.25,y:.28,r:.067,gain:.92},{x:1.19,y:.3,r:.085,gain:1.05},{x:1.02,y:.82,r:.06,gain:.8}];
    }
    emit(x,y,band,amp=1,self=false) {
      const event={x,y,band,amp,t:this.tick,self,reflected:false}; this.events.push(event);
      // First-order reflected rays. No recursive echoes or hidden target labels.
      for(const r of this.reflectors) {
        const d=Math.hypot(r.x-x,r.y-y);
        this.events.push({x:r.x,y:r.y,band,amp:amp*r.gain/(1+2*d),t:this.tick+d/SPEED,self,reflected:true});
      }
    }
    valueAt(x,y,band) {
      let value=0;
      for(const ev of this.events) if(ev.band===band) {
        const d=Math.hypot(x-ev.x,y-ev.y);
        value+=ev.amp*kernel(this.tick-ev.t-d/SPEED,band)/(1+1.6*d);
      }
      return value;
    }
    sample() {
      const y=new Float64Array(BANDS*EARS);
      for(let b=0;b<BANDS;b++) for(let e=0;e<EARS;e++) {
        const a=e*Math.PI/2;
        y[b*EARS+e]=this.valueAt(this.body.x+.048*Math.cos(a),this.body.y+.048*Math.sin(a),b)+(this.rng.next()-.5)*.0008;
      }
      return y;
    }
    advance() { this.tick++; this.events=this.events.filter(e=>this.tick-e.t<125); }
  }
  class Organism {
    constructor(seed=731) {
      this.world=new Pond(seed); this.predictor=new Predictor(); this.rng=new Random(seed+1);
      this.copy=true; this.learning=true; this.roam=true; this.band=-1; this.nextPing=6;
      this.pings=0; this.bandCount=[0,0,0]; this.observed=new Float64Array(12);
      this.predicted=new Float64Array(12); this.residual=new Float64Array(12);
      this.energy=[.001,.001,.001]; this.mismatch=[.001,.001,.001]; this.surprise=0;
      this.history=[]; this.path=[]; this.attention=[0,0]; this.motion=0; this.lastMove=-2000;
      this.status='Learning my echo'; this.lastEvent='A new body. No learned echo yet.';
      this.lastCommand=[0,0,0]; this.auto=true;
    }
    ping(band=this.band) {
      const b=band<0 ? this.pings%3 : band;
      const amp=this.rng.next()<.5 ? -1 : 1;
      this.world.emit(this.world.body.x,this.world.body.y,b,amp,true);
      this.lastCommand[b]+=amp; this.pings++; this.bandCount[b]++;
      return {band:b,amp};
    }
    disturb(x,y,band=1,amp=1.4) {
      this.world.emit(clamp(x,.04,1.46),clamp(y,.04,.96),band,amp,false);
      // This UI note is not fed to the predictor or policy.
      this.lastEvent='A ripple entered the pond. Watch the return.';
    }
    step() {
      const w=this.world;
      let launch=null;
      if(this.auto && w.tick>=this.nextPing) { launch=this.ping(); this.nextPing=w.tick+20+Math.floor(this.rng.next()*9); }
      const command=this.lastCommand.slice(); this.lastCommand=[0,0,0];
      this.predicted.set(this.predictor.predict(command,this.copy));
      this.observed.set(w.sample());
      this.residual.set(this.predictor.observe(this.observed,this.learning&&this.copy));
      let instant=0; const earEnergy=[0,0,0,0];
      for(let b=0;b<3;b++) {
        let yy=0,rr=0;
        for(let e=0;e<4;e++) {const j=b*4+e; yy+=this.observed[j]**2/4; rr+=this.residual[j]**2/4; earEnergy[e]+=this.residual[j]**2;}
        this.energy[b]=.98*this.energy[b]+.02*yy;
        this.mismatch[b]=.98*this.mismatch[b]+.02*rr;
        instant+=rr;
      }
      this.surprise=.87*this.surprise+.13*Math.sqrt(instant/3);
      this.attention[0]=.9*this.attention[0]+.1*(earEnergy[0]-earEnergy[2]);
      this.attention[1]=.9*this.attention[1]+.1*(earEnergy[1]-earEnergy[3]);
      // Deliberately small hand-written curiosity policy. Prediction is learned;
      // curiosity is supplied. Motion only uses local residual gradients.
      if(this.roam && this.copy && w.tick>900 && this.surprise>.055 && w.tick-this.lastMove>700) {
        const n=Math.hypot(...this.attention);
        if(n>.00005) { w.body.vx=this.attention[0]/n*.0016; w.body.vy=this.attention[1]/n*.0016; this.motion=65; this.lastMove=w.tick; }
      }
      if(this.motion>0) {
        w.body.x=clamp(w.body.x+w.body.vx,.13,1.37); w.body.y=clamp(w.body.y+w.body.vy,.13,.87); this.motion--;
      } else {w.body.vx*=.8; w.body.vy*=.8;}
      this.status=!this.copy ? 'Without my internal copy' : this.motion>0 ? 'Turning toward a mismatch' : w.tick<600 ? 'Learning my echo' : this.surprise>.045 ? 'Something does not fit' : this.fit>.8 ? 'My echo is familiar' : 'Updating my expectation';
      const sample={t:w.tick,y:this.observed[0],p:this.predicted[0],r:this.residual[0],ys:[0,4,8].map(i=>this.observed[i]),ps:[0,4,8].map(i=>this.predicted[i]),rs:[0,4,8].map(i=>this.residual[i]),surprise:this.surprise,band:launch?.band??-1};
      this.history.push(sample); if(this.history.length>600) this.history.shift();
      if(w.tick%12===0) {this.path.push({x:w.body.x,y:w.body.y}); if(this.path.length>260)this.path.shift();}
      w.advance(); return launch;
    }
    get fit() { const a=this.energy.reduce((x,y)=>x+y,0),r=this.mismatch.reduce((x,y)=>x+y,0); return clamp(1-r/(a+.00001),0,1); }
    snapshot() { return {schema:'thinkingjello/1',world:{tick:this.world.tick,body:this.world.body,reflectors:this.world.reflectors,events:this.world.events,rng:this.world.rng.state},predictor:this.predictor.toJSON(),rng:this.rng.state,controls:{copy:this.copy,learning:this.learning,roam:this.roam,band:this.band,auto:this.auto},pings:this.pings,bandCount:this.bandCount,nextPing:this.nextPing,energy:this.energy,mismatch:this.mismatch,history:this.history,path:this.path,lastCommand:this.lastCommand,attention:this.attention,motion:this.motion,lastMove:this.lastMove,surprise:this.surprise}; }
    static restore(s) {
      if(s?.schema!=='thinkingjello/1') throw Error('This is not a ThinkingJello memory.');
      const o=new Organism(); o.predictor=Predictor.fromJSON(s.predictor);
      const finite=(x)=>typeof x==='number'&&Number.isFinite(x);
      const pos=(p)=>p&&finite(p.x)&&finite(p.y)&&p.x>=0&&p.x<=1.5&&p.y>=0&&p.y<=1;
      if(o.predictor.ears!==4 || !s.world || !Number.isSafeInteger(s.world.tick)||s.world.tick<0||!pos(s.world.body)||!finite(s.world.body.vx)||!finite(s.world.body.vy)||!Array.isArray(s.world.reflectors)||s.world.reflectors.length>12||!s.world.reflectors.every(r=>pos(r)&&finite(r.r)&&r.r>0&&r.r<.3&&finite(r.gain)&&r.gain>=0&&r.gain<3)) throw Error('Invalid pond state.');
      if(!Array.isArray(s.world.events)||s.world.events.length>1500||!s.world.events.every(e=>pos(e)&&[0,1,2].includes(e.band)&&finite(e.amp)&&Math.abs(e.amp)<=10&&finite(e.t))) throw Error('Invalid signal state.');
      const arr=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(finite);
      if(!arr(s.energy,3)||!arr(s.mismatch,3)||!arr(s.bandCount,3)||!arr(s.lastCommand,3)||!arr(s.attention,2)||![s.rng,s.world.rng,s.pings,s.nextPing,s.motion,s.lastMove,s.surprise].every(finite)) throw Error('Invalid organism state.');
      if(!s.controls||![-1,0,1,2].includes(s.controls.band)||!['copy','learning','roam','auto'].every(k=>typeof s.controls[k]==='boolean'))throw Error('Invalid controls.');
      if(!Array.isArray(s.history)||s.history.length>600||!s.history.every(h=>[h.t,h.y,h.p,h.r,h.surprise,h.band].every(finite)&&['ys','ps','rs'].every(k=>h[k]===undefined||arr(h[k],3)))||!Array.isArray(s.path)||s.path.length>260||!s.path.every(pos))throw Error('Invalid trace.');
      Object.assign(o.world,{tick:s.world.tick,body:{...s.world.body},reflectors:s.world.reflectors.map(r=>({...r})),events:s.world.events.map(e=>({...e}))}); o.world.rng.state=s.world.rng>>>0; o.rng.state=s.rng>>>0;
      Object.assign(o,s.controls); for(const k of ['pings','nextPing','motion','lastMove','surprise'])o[k]=s[k];
      for(const k of ['energy','mismatch','bandCount','history','path','lastCommand','attention'])o[k]=structuredClone(s[k]);
      o.lastEvent='Memory restored, including the travelling signals.'; return o;
    }
  }
  return {Predictor,Pond,Organism,Random,clamp,kernel,BANDS,EARS,TAPS,SPEED,COLORS};
});
