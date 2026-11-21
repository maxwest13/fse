/* Forward Systems / FS_001 : FLOW FIELD
   Purpose: visibly move the COLOR, not just distort the whole heatmap image.
   - GPU advection driven by pointer position + velocity
   - circular currents, directional wake, slow continual energy flow
   - crisp stationary grid is a separate CSS layer
   - static image fallback, reduced motion, offscreen pause, context-loss guard
   No frameworks or external network dependencies. GitHub Pages compatible.
*/
(() => {
  'use strict';
  const stage = document.getElementById('heatmap-stage');
  const canvas = document.getElementById('heatmap-fluid');
  if (!stage || !canvas || !window.WebGLRenderingContext ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, powerPreference: 'default'
  });
  if (!gl) { init2D(); return; }

  function init2D() {
    // Progressive enhancement for browsers without a usable WebGL context.
    // Draw advection in a lightweight tile field. Less elaborate than the
    // shader, but the luminous colors still curl and flow around the pointer.
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)return;
    const picture=new Image();
    let width=0,height=0,power=0,hover=false,px=.5,py=.5,tx=.5,ty=.5;
    let vx=0,vy=0,old=null,last=performance.now(),startTime=last,active=true;
    let rAF=0;
    function resize(){
      const rect=stage.getBoundingClientRect();width=rect.width;height=rect.height;
      const scale=Math.min(1,960/Math.max(1,width));
      canvas.width=Math.max(1,Math.round(width*scale));
      canvas.height=Math.max(1,Math.round(height*scale));
    }
    function pointer(e){
      if(e.pointerType==='touch'&&e.type==='pointermove'&&e.buttons!==1)return;
      const r=stage.getBoundingClientRect();
      tx=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
      ty=Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height));
      const now=performance.now();
      if(old){const dt=Math.max(.015,(now-old.at)/1000);vx=Math.max(-1,Math.min(1,(tx-old.x)/dt*.2));vy=Math.max(-1,Math.min(1,(ty-old.y)/dt*.2));}
      old={x:tx,y:ty,at:now};hover=true;
      stage.style.setProperty('--pointer-x',(tx*100)+'%');
      stage.style.setProperty('--pointer-y',((1-ty)*100)+'%');
    }
    function render(now){
      if(!active ||document.hidden){rAF=0;return;}
      const dt=Math.max(.001,Math.min(.05,(now-last)/1000));last=now;
      px+=(tx-px)*(1-Math.exp(-dt*10));py+=(ty-py)*(1-Math.exp(-dt*10));
      power+=((hover?1:0)-power)*(1-Math.exp(-dt*(hover?5:2)));
      vx*=Math.exp(-dt*3);vy*=Math.exp(-dt*3);
      const W=canvas.width,H=canvas.height,aspect=W/H;
      const imgAsp=picture.naturalWidth/picture.naturalHeight;
      const coverX=aspect>imgAsp?1:aspect/imgAsp,coverY=aspect>imgAsp?imgAsp/aspect:1;
      const t=(now-startTime)/1000;
      ctx.clearRect(0,0,W,H);
      const tile=26;
      for(let y=0;y<H;y+=tile){
        for(let x=0;x<W;x+=tile){
          const tw=Math.min(tile,W-x),th=Math.min(tile,H-y);
          const u=(x+tw*.5)/W,v=1-(y+th*.5)/H;
          const dx=(u-px)*aspect,dy=v-py,rad=Math.hypot(dx,dy);
          const fall=Math.exp(-rad*rad/(.48*.48));
          const rot=Math.sin(t*.98+rad*10.)*.5+.5;
          const driftX=.0035*Math.sin(v*8.0+t*.3);
          const driftY=.0025*Math.cos(u*10.-t*.2);
          const wx=((-dy*(.055+.06*rot)+vx*.05)*fall*power)/aspect+driftX;
          const wy=((dx*(.055+.06*rot)+vy*.05)*fall*power)+driftY;
          const su=((u+wx-.5)*coverX+.5)*picture.naturalWidth;
          const sv=((1-v-wy-.5)*coverY+.5)*picture.naturalHeight;
          const sw=(tw/W)*coverX*picture.naturalWidth;
          const sh=(th/H)*coverY*picture.naturalHeight;
          const sx=Math.max(0,Math.min(picture.naturalWidth-sw,su-sw*.5));
          const sy=Math.max(0,Math.min(picture.naturalHeight-sh,sv-sh*.5));
          ctx.drawImage(picture,sx,sy,sw,sh,x,y,tw+1,th+1);
        }
      }
      if(power>.01){
        const gx=px*W,gy=(1-py)*H;
        const grad=ctx.createRadialGradient(gx,gy,0,gx,gy,Math.max(80,H*.38));
        grad.addColorStop(0,`rgba(131,60,240,${.12*power})`);
        grad.addColorStop(1,'rgba(20,30,100,0)');
        ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
      }
      rAF=requestAnimationFrame(render);
    }
    function start(){if(!rAF&&active){last=performance.now();rAF=requestAnimationFrame(render);}}
    picture.onload=()=>{
      resize();stage.classList.add('fluid-ready');stage.dataset.effect='v7-advected-color-2d-fallback';
      stage.addEventListener('pointerenter',e=>{stage.classList.add('is-engaged');pointer(e);},{passive:true});
      stage.addEventListener('pointermove',pointer,{passive:true});
      const leave=()=>{hover=false;old=null;stage.classList.remove('is-engaged');};
      stage.addEventListener('pointerleave',leave,{passive:true});
      stage.addEventListener('pointercancel',leave,{passive:true});
      stage.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')leave();},{passive:true});
      new ResizeObserver(resize).observe(stage);
      new IntersectionObserver(es=>{active=es[0].isIntersecting;if(active)start();else{cancelAnimationFrame(rAF);rAF=0;}},{threshold:0}).observe(stage);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();});
      start();
    };
    picture.src='assets/heatmap-field.webp';
  }

  const vertex = `
    attribute vec2 a_xy;
    varying vec2 v_uv;
    void main() {
      v_uv = .5 * (a_xy + 1.);
      gl_Position = vec4(a_xy, 0., 1.);
    }
  `;
  const fragment = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_image;
    uniform vec2 u_pointer;
    uniform vec2 u_tail;
    uniform vec2 u_velocity;
    uniform float u_power;
    uniform float u_t;
    uniform float u_aspect;
    uniform vec2 u_cover;

    float bell(float d, float r) {return exp(-(d*d)/(r*r));}
    vec2 xy(vec2 uv) {return (uv - vec2(.5)) * vec2(u_aspect, 1.);}

    // Coordinates live in aspect-corrected image space so currents do not
    // stretch into ellipses on wide monitors.
    vec2 current(vec2 uv, vec2 center, float radius, float phase) {
      vec2 d=(uv-center)*vec2(u_aspect,1.);
      float r=length(d);
      float falloff=bell(r,radius);
      vec2 radial=d/max(r,.0001);
      vec2 tangent=vec2(-radial.y,radial.x);
      float swirl=sin(u_t*.92 + r*9. - phase)*.48+.52;
      float pulse=sin(u_t*1.28-r*13.+phase)*.5+.5;
      // Vortex + soft expanding pressure rings: color wraps around the cursor.
      return (tangent*(.032 + .085*swirl) + radial*(.022*pulse-.013))
             * falloff * u_power;
    }

    void main() {
      vec2 uv=v_uv;
      vec2 wp=(u_pointer-vec2(.5))*vec2(u_aspect,1.);
      vec2 tp=(u_tail-vec2(.5))*vec2(u_aspect,1.);

      // Slow, always-on internal flow. Subtle enough to keep the site calm.
      vec2 base=vec2(
        .020*sin(uv.y*7.8 + u_t*.28) + .006*sin(uv.y*22. - u_t*.17),
        .014*sin(uv.x*8.3 - u_t*.24) + .008*cos(uv.x*12. + u_t*.21)
      );
      base*=.18 + u_power*.42;

      vec2 v=u_velocity;
      float speed=min(1.,length(v));
      vec2 advect=current(uv,u_pointer,.46,.7);
      advect+=current(uv,u_tail,.61,2.2)*.62;
      // Travel follows cursor movement, making the color stretch into a wake.
      float behind=bell(length(xy(uv)-wp),.70);
      advect+=v*(.040 + speed*.040)*behind*u_power;
      // A flowing pressure front runs rightward along the luminous band.
      advect+=vec2(.020*sin(u_t*1.1+uv.y*8.5),.015*cos(u_t*.8+uv.x*10.))
                    *behind*u_power;
      vec2 sampleUV=uv + base + advect/vec2(u_aspect,1.);
      vec2 texUV=(sampleUV-.5)*u_cover+.5;
      texUV=clamp(texUV,vec2(.002),vec2(.998));
      vec3 color=texture2D(u_image,texUV).rgb;

      // Moving ultraviolet / blue refractions illuminate existing color;
      // they are masked by the original brightness so the background stays dark.
      float luminance=dot(color,vec3(.2126,.7152,.0722));
      float lit=smoothstep(.09,.36,luminance);
      float hot=bell(length(xy(uv)-wp),.40)*u_power;
      float tail=bell(length(xy(uv)-tp),.58)*u_power;
      float moving=sin(u_t*2.4 - length(xy(uv)-wp)*13.0);
      vec3 tint=mix(vec3(.16,.035,.38),vec3(.02,.22,.49),.5+.5*moving);
      color += tint * (hot*.18 + tail*.08) * lit;
      color*=1.0+(.045*hot + .023*tail)*lit;

      // Faint vignette, no solid bloom covering the underlying graphic.
      vec2 vv=(uv-.5)*vec2(.65,1.);
      float vignette=1.0-.085*smoothstep(.18,.78,length(vv));
      gl_FragColor=vec4(max(color*vignette,vec3(0.)),1.);
    }
  `;

  function shader(kind,src) {
    const s=gl.createShader(kind);
    gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      console.warn('Forward Systems shader:',gl.getShaderInfoLog(s));
      gl.deleteShader(s);return null;
    }
    return s;
  }
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
  if(!vs||!fs)return;
  const prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){
    console.warn('Forward Systems shader link:',gl.getProgramInfoLog(prog));return;
  }
  gl.useProgram(prog);
  const names=['u_image','u_pointer','u_tail','u_velocity','u_power','u_t','u_aspect','u_cover'];
  const U=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(prog,n)]));
  const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const a=gl.getAttribLocation(prog,'a_xy');
  gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  gl.activeTexture(gl.TEXTURE0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.u_image,0);

  const pointer={x:.5,y:.5},target={x:.5,y:.5},tail={x:.5,y:.5},velocity={x:0,y:0};
  let lastEvent=null, hovering=false,power=0,visible=true,initialized=false;
  let running=false,raf=0,lastTick=performance.now(),startTime=lastTick;
  let width=0,height=0;

  function resize(img) {
    const rect=stage.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    width=rect.width;height=rect.height;
    // Limit GPU pixels to keep the shader comfortable on high-density phones.
    const dpr=Math.min(devicePixelRatio||1,1.5);
    const w=Math.round(width*dpr),h=Math.round(height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
    const imageAspect=img.naturalWidth/img.naturalHeight,boxAspect=width/height;
    const cx=boxAspect>imageAspect?1:boxAspect/imageAspect;
    const cy=boxAspect>imageAspect?imageAspect/boxAspect:1;
    gl.uniform2f(U.u_cover,cx,cy);gl.uniform1f(U.u_aspect,boxAspect);
  }

  function getPosition(e){
    const rect=stage.getBoundingClientRect();
    return {x:Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),
            y:Math.max(0,Math.min(1,1-(e.clientY-rect.top)/rect.height))};
  }
  function onPointer(e){
    if(e.pointerType==='touch'&&e.type==='pointermove'&&e.buttons!==1)return;
    const p=getPosition(e),now=performance.now();
    if(lastEvent){
      const dt=Math.max(.015,Math.min(.15,(now-lastEvent.when)/1000));
      velocity.x=Math.max(-1,Math.min(1,(p.x-lastEvent.x)/dt*.18));
      velocity.y=Math.max(-1,Math.min(1,(p.y-lastEvent.y)/dt*.18));
    }
    target.x=p.x;target.y=p.y;hovering=true;
    lastEvent={...p,when:now};
    stage.style.setProperty('--pointer-x',(p.x*100).toFixed(2)+'%');
    stage.style.setProperty('--pointer-y',((1-p.y)*100).toFixed(2)+'%');
    start();
  }
  function onLeave(){hovering=false;lastEvent=null;stage.classList.remove('is-engaged');}
  function draw(now){
    running=false;
    if(!visible||document.hidden||!initialized)return;
    const dt=Math.max(.001,Math.min(.05,(now-lastTick)/1000));lastTick=now;
    const easing=1-Math.exp(-dt*10),tailEase=1-Math.exp(-dt*2.05);
    pointer.x+=(target.x-pointer.x)*easing;pointer.y+=(target.y-pointer.y)*easing;
    tail.x+=(pointer.x-tail.x)*tailEase;tail.y+=(pointer.y-tail.y)*tailEase;
    power+=((hovering?1:0)-power)*(1-Math.exp(-dt*(hovering?5.5:2.1)));
    const decay=Math.exp(-dt*2.5);velocity.x*=decay;velocity.y*=decay;
    gl.uniform2f(U.u_pointer,pointer.x,pointer.y);
    gl.uniform2f(U.u_tail,tail.x,tail.y);
    gl.uniform2f(U.u_velocity,velocity.x,velocity.y);
    gl.uniform1f(U.u_power,power);
    gl.uniform1f(U.u_t,(now-startTime)/1000);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    start();
  }
  function start(){if(running||!visible||document.hidden||!initialized)return;running=true;raf=requestAnimationFrame(draw);}

  const img=new Image();
  img.onload=()=>{
    if(!img.naturalWidth)return;
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    gl.uniform2f(U.u_pointer,.5,.5);gl.uniform2f(U.u_tail,.5,.5);
    gl.uniform2f(U.u_velocity,0,0);gl.uniform1f(U.u_power,0);gl.uniform1f(U.u_t,0);
    resize(img);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    initialized=true;stage.classList.add('fluid-ready');
    stage.dataset.effect='v7-advected-color-field';
    stage.addEventListener('pointerenter',e=>{stage.classList.add('is-engaged');onPointer(e);},{passive:true});
    stage.addEventListener('pointermove',onPointer,{passive:true});
    stage.addEventListener('pointerleave',onLeave,{passive:true});
    stage.addEventListener('pointercancel',onLeave,{passive:true});
    stage.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')onLeave();},{passive:true});
    const io=new IntersectionObserver(es=>{
      visible=es[0].isIntersecting;
      if(visible)start();else{cancelAnimationFrame(raf);running=false;}
    });io.observe(stage);
    new ResizeObserver(()=>resize(img)).observe(stage);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastTick=performance.now();start();}});
    stage.addEventListener('webglcontextlost',e=>{
      e.preventDefault();stage.classList.remove('fluid-ready');cancelAnimationFrame(raf);running=false;initialized=false;
    });
    start();
  };
  img.onerror=()=>console.warn('Forward Systems: heatmap field could not load; showing static fallback.');
  img.src='assets/heatmap-field.webp';
})();
