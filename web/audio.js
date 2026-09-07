/* Optional real speaker/microphone adapter. No audio ever leaves the browser. */
(function(root) {
  'use strict';
  class RoomEar {
    constructor() {
      this.model=new Jello.Predictor(Jello.TAPS,1); this.running=false; this.tick=0; this.pings=0;
      this.energy=[.00001,.00001,.00001];this.mismatch=[.00001,.00001,.00001];this.baseline=[0,0,0];
      this.observed=new Float64Array(3);this.predicted=new Float64Array(3);this.residual=new Float64Array(3);
      this.history=[];this.surprise=0;this.volume=.018;this.copy=true;this.learning=true;this.frequencies=[260,650,1500];this.nextPing=65;this.sources=new Set();
    }
    async start(deviceId='') {
      if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone access requires HTTPS and a supported browser.');
      this.stop();
      const ctx=new (window.AudioContext||window.webkitAudioContext)();this.context=ctx;
      try {
        await ctx.resume();
        const stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:deviceId?{exact:deviceId}:undefined,echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
        // A tab switch / stop while the permission prompt was open cancels setup.
        if(this.context!==ctx){stream.getTracks().forEach(t=>t.stop());return false;}
        this.stream=stream;this.input=ctx.createMediaStreamSource(stream);this.analyser=ctx.createAnalyser();
        this.analyser.fftSize=2048;this.analyser.smoothingTimeConstant=0;
        this.input.connect(this.analyser); // deliberately never connect microphone to output
        this.spectrum=new Float32Array(this.analyser.frequencyBinCount);
        this.tick=0;this.nextPing=65;this.baseline=[0,0,0];this.running=true;this.lastWall=performance.now();
        return true;
      } catch(e) {this.stop();throw e;}
    }
    stop() {
      this.running=false;
      for(const osc of this.sources)try{osc.stop();}catch{} this.sources.clear();
      this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
      this.input?.disconnect();this.input=null;
      if(this.context){this.context.close().catch(()=>{});this.context=null;}
    }
    launch(band) {
      if(!this.running)return;
      const ctx=this.context,osc=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;
      osc.frequency.value=this.frequencies[band];g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(this.volume,t+.012);g.gain.exponentialRampToValueAtTime(.00001,t+.085);
      osc.connect(g);g.connect(ctx.destination);osc.start(t);osc.stop(t+.095);this.sources.add(osc);osc.onended=()=>{osc.disconnect();g.disconnect();this.sources.delete(osc);};
    }
    step() {
      if(!this.running)return null;
      // The envelope clock is real time. Never accelerate or batch room pings.
      const cmd=[0,0,0];let launch=null;
      if(this.tick>=this.nextPing){const band=this.pings%3;this.launch(band);cmd[band]=this.volume/.018;this.pings++;this.nextPing=this.tick+30;launch={band,amp:1};}
      this.predicted.set(this.model.predict(cmd,this.copy));
      this.analyser.getFloatFrequencyData(this.spectrum);
      for(let b=0;b<3;b++) {
        const df=this.context.sampleRate/this.analyser.fftSize,lo=Math.max(1,Math.floor(this.frequencies[b]*.8/df)),hi=Math.min(this.spectrum.length-1,Math.ceil(this.frequencies[b]*1.2/df));let sum=0;
        for(let k=lo;k<=hi;k++)sum+=10**(this.spectrum[k]/10);
        const level=Math.sqrt(sum)*6;
        if(this.tick<60)this.baseline[b]+=(level-this.baseline[b])/(this.tick+1);
        this.observed[b]=Math.max(0,level-this.baseline[b]);
      }
      this.residual.set(this.model.observe(this.observed,this.learning&&this.copy&&this.tick>60,.38));
      let rr=0;
      for(let b=0;b<3;b++){this.energy[b]=.97*this.energy[b]+.03*this.observed[b]**2;this.mismatch[b]=.97*this.mismatch[b]+.03*this.residual[b]**2;rr+=this.residual[b]**2;}
      this.surprise=.87*this.surprise+.13*Math.sqrt(rr/3);
      this.history.push({t:this.tick,y:this.observed[0],p:this.predicted[0],r:this.residual[0],surprise:this.surprise,band:launch?.band??-1});if(this.history.length>600)this.history.shift();
      this.tick++;return launch;
    }
    get fit(){return Jello.clamp(1-this.mismatch.reduce((a,b)=>a+b,0)/(this.energy.reduce((a,b)=>a+b,0)+1e-8),0,1);}
    get status(){return !this.running?'A window into your room':this.tick<60?'Listening before I act':!this.copy?'Without my internal copy':this.surprise>.04?'Something does not fit':this.fit>.7?'Learning the room’s response':'Listening to my own pings';}
    snapshot(){return {schema:'thinkingjello/room-1',model:this.model.toJSON(),volume:this.volume};}
    static restore(s){if(s?.schema!=='thinkingjello/room-1'||!Number.isFinite(s.volume)||s.volume<0||s.volume>.08)throw Error('Invalid room memory.');const r=new RoomEar();r.model=Jello.Predictor.fromJSON(s.model);if(r.model.ears!==1)throw Error('Invalid room model.');r.volume=s.volume;return r;}
  }
  root.RoomEar=RoomEar;
})(globalThis);
