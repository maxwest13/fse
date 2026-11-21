/* Forward Systems / Field Study 001
   Custom WebGL image deformation. No external libraries or network calls.
   Distortion follows pointer location and velocity; idle motion is almost invisible.
   Reduces motion, handles touch, pauses off screen, and falls back to the original image.
*/
(() => {
  'use strict';
  const stage = document.getElementById('heatmap-stage');
  const canvas = document.getElementById('heatmap-fluid');
  const image = stage?.querySelector('.heatmap-fallback');
  if (!stage || !canvas || !image || !window.WebGLRenderingContext ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, premultipliedAlpha: false,
    depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'
  });
  if (!gl) return;

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * .5 + .5;
      gl_Position = vec4(a_position, 0., 1.);
    }
  `;
  const fragmentSource = `
    precision highp float;
    uniform sampler2D u_image;
    uniform vec2 u_pointer;
    uniform vec2 u_trail;
    uniform vec2 u_velocity;
    uniform float u_strength;
    uniform float u_time;
    uniform float u_aspect;
    uniform vec2 u_cover;
    varying vec2 v_uv;

    float field(vec2 p, vec2 center, float radius) {
      vec2 r = (p - center) * vec2(u_aspect, 1.);
      return exp(-dot(r,r) / (radius * radius));
    }
    vec2 getWarp(vec2 uv, vec2 center, float radius, float amount) {
      vec2 diff = (uv - center) * vec2(u_aspect, 1.);
      float dist = length(diff);
      vec2 direction = diff / max(dist, .001);
      vec2 tangent = vec2(-direction.y, direction.x);
      float f = field(uv, center, radius) * amount;
      float wave = sin(dist * 32. - u_time * 1.7) * .005;
      vec2 velocity = u_velocity * (.015 * f);
      // Position is the center of a localized refractive current,
      // not a transform of the whole texture.
      vec2 local = f * (direction * (.024 + wave) + tangent * .018) + velocity;
      local.x /= u_aspect;
      return local;
    }
    void main() {
      vec2 uv = v_uv;
      float active = u_strength;
      float idle = sin(u_time*.3 + uv.x*4.) * .0007 * sin(uv.y*3.1 + u_time*.18);
      vec2 warped = uv + vec2(idle, -idle * .5);
      warped += getWarp(uv, u_pointer, .26, active);
      warped += getWarp(uv, u_trail, .31, active * .40);

      // Cover behavior matches object-fit:cover on the original source.
      vec2 textureUV = (warped - .5) * u_cover + .5;
      vec3 col = texture2D(u_image, clamp(textureUV, vec2(.001), vec2(.999))).rgb;
      float halo = field(uv, u_pointer, .13) * active;
      vec3 ultraviolet = vec3(.14,.075,.22) * halo * .24;
      col += ultraviolet;
      gl_FragColor = vec4(col, 1.);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Forward Systems fluid shader:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader); return null;
    }
    return shader;
  }
  const v = compile(gl.VERTEX_SHADER, vertexSource);
  const f = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!v || !f) return;
  const program = gl.createProgram();
  gl.attachShader(program, v); gl.attachShader(program, f);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Forward Systems fluid shader:', gl.getProgramInfoLog(program)); return;
  }
  gl.useProgram(program);
  const loc = Object.fromEntries(['u_image','u_pointer','u_trail','u_velocity','u_strength','u_time','u_aspect','u_cover']
    .map(name => [name,gl.getUniformLocation(program,name)]));

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.uniform1i(loc.u_image,0);

  const pointer = {x: .5, y: .5};
  const target = {x: .5, y: .5};
  const trail = {x: .5, y: .5};
  const velocity = {x: 0, y: 0};
  let lastEvent = null, hover = false, strength = 0, running = false;
  let visible = true, frameId = 0, started = performance.now(), lastTick = started;
  let width = 0, height = 0, imgWidth = 0, imgHeight = 0;

  function resize() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1,Math.round(width * dpr));
    const h = Math.max(1,Math.round(height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0,0,w,h);
    }
    // Multipliers to reproduce object-fit: cover without clipping or stretching the texture.
    const imageAspect = imgWidth/imgHeight;
    const boxAspect = width/height;
    const coverX = boxAspect>imageAspect ? 1 : boxAspect/imageAspect;
    const coverY = boxAspect>imageAspect ? imageAspect/boxAspect : 1;
    gl.uniform2f(loc.u_cover,coverX,coverY);
    gl.uniform1f(loc.u_aspect,boxAspect);
  }

  function onPointer(e) {
    if (e.pointerType === 'touch' && e.type === 'pointermove' && e.buttons !== 1) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.min(1,Math.max(0,(e.clientX - rect.left)/rect.width));
    const y = Math.min(1,Math.max(0,1-(e.clientY - rect.top)/rect.height));
    const now = performance.now();
    if (lastEvent) {
      const dt = Math.max(.012,Math.min(.15,(now-lastEvent.at)/1000));
      velocity.x = Math.max(-1,Math.min(1,(x-lastEvent.x)/dt * .36));
      velocity.y = Math.max(-1,Math.min(1,(y-lastEvent.y)/dt * .36));
    }
    target.x = x;target.y = y;
    hover = true;
    lastEvent = {x,y,at:now};
    start();
  }
  function onLeave() {hover = false; lastEvent = null;}

  function draw(now) {
    running = false;
    if (!visible || document.hidden) return;
    const dt = Math.min(.05,Math.max(.001,(now-lastTick)/1000));
    lastTick = now;
    const ease = 1 - Math.exp(-dt * 14);
    const trailEase = 1 - Math.exp(-dt * 3.3);
    pointer.x += (target.x-pointer.x) * ease;
    pointer.y += (target.y-pointer.y) * ease;
    trail.x += (pointer.x-trail.x) * trailEase;
    trail.y += (pointer.y-trail.y) * trailEase;
    strength += ((hover?1:0)-strength) * (1 - Math.exp(-dt*(hover?6:2.7)));
    const decay = Math.exp(-dt*3.7);
    velocity.x *= decay;velocity.y *= decay;
    gl.uniform2f(loc.u_pointer,pointer.x,pointer.y);
    gl.uniform2f(loc.u_trail,trail.x,trail.y);
    gl.uniform2f(loc.u_velocity,velocity.x,velocity.y);
    gl.uniform1f(loc.u_strength,strength);
    gl.uniform1f(loc.u_time,(now-started)/1000);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    start();
  }
  function start() {
    if (running || !visible || document.hidden) return;
    running = true;
    frameId = requestAnimationFrame(draw);
  }

  function init() {
    if (image.naturalWidth === 0 || image.naturalHeight === 0) return;
    imgWidth=image.naturalWidth;imgHeight=image.naturalHeight;
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    resize();
    gl.uniform2f(loc.u_pointer,.5,.5);
    gl.uniform2f(loc.u_trail,.5,.5);
    gl.uniform2f(loc.u_velocity,0,0);
    gl.uniform1f(loc.u_strength,0);
    gl.uniform1f(loc.u_time,0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    stage.classList.add('fluid-ready');
    stage.addEventListener('pointerenter',onPointer,{passive:true});
    stage.addEventListener('pointermove',onPointer,{passive:true});
    stage.addEventListener('pointerleave',onLeave,{passive:true});
    stage.addEventListener('pointercancel',onLeave,{passive:true});
    stage.addEventListener('pointerup',e=>{ if(e.pointerType!=='mouse') onLeave(); },{passive:true});
    const observer=new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(visible) start(); else { cancelAnimationFrame(frameId);running=false; }
    },{threshold:0});
    observer.observe(stage);
    new ResizeObserver(resize).observe(stage);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();});
    stage.addEventListener('webglcontextlost',e=>{e.preventDefault();stage.classList.remove('fluid-ready');cancelAnimationFrame(frameId);running=false;});
    start();
    // Useful for the local interaction sanity check. Not needed by the UI.
    stage.dataset.effect = 'fluid-position-responsive';
  }
  if(image.complete) init();else image.addEventListener('load',init,{once:true});
})();
