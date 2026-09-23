(() => {
  const starCanvas = document.querySelector('#stars');
  const globeCanvas = document.querySelector('#globe');
  const fxCanvas = document.querySelector('#fx');
  const starCtx = starCanvas.getContext('2d');
  const fx = fxCanvas.getContext('2d');
  const gl = globeCanvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    depth: true,
    powerPreference: 'high-performance'
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const cinematic = t => {
    t = clamp(t);
    return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  let w = 0, h = 0, dpr = 1, startedAt = 0, ready = false;
  let mouse = { x: .5, tx: .5 };

  const regions = [
    { lon: -100, lat: 39, delay: 1.85 },
    { lon: -47, lat: -18, delay: 2.08 },
    { lon: 8, lat: 50, delay: 2.28 },
    { lon: 24, lat: -29, delay: 2.48 },
    { lon: 78, lat: 22, delay: 2.68 },
    { lon: 116, lat: 35, delay: 2.88 },
    { lon: 151, lat: -28, delay: 3.08 }
  ];

  function sizeCanvas(canvas, ratio) {
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }

  function drawStars() {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    sizeCanvas(starCanvas, ratio);
    starCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    starCtx.clearRect(0, 0, w, h);
    const sky = starCtx.createRadialGradient(w * .66, h * .42, 0, w * .66, h * .42, Math.max(w, h) * .8);
    sky.addColorStop(0, '#061938');
    sky.addColorStop(.38, '#020d22');
    sky.addColorStop(1, '#010713');
    starCtx.fillStyle = sky;
    starCtx.fillRect(0, 0, w, h);
    const seed = 9147;
    let state = seed;
    const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
    const count = w < 700 ? 170 : 360;
    for (let i = 0; i < count; i++) {
      const x = random() * w, y = random() * h;
      const radius = .25 + Math.pow(random(), 4) * 1.65;
      const alpha = .18 + random() * .62;
      starCtx.beginPath();
      starCtx.arc(x, y, radius, 0, Math.PI * 2);
      starCtx.fillStyle = `rgba(181,216,255,${alpha})`;
      starCtx.fill();
    }
    const haze = starCtx.createLinearGradient(0, h * .18, w, h * .82);
    haze.addColorStop(0, 'rgba(77,220,255,0)');
    haze.addColorStop(.5, 'rgba(8,123,255,.032)');
    haze.addColorStop(1, 'rgba(245,6,141,0)');
    starCtx.fillStyle = haze;
    starCtx.fillRect(0, 0, w, h);
  }

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed');
    }
    return shader;
  }

  function programFrom(vertexSource, fragmentSource) {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Shader linking failed');
    }
    return program;
  }

  function createSphere(latBands = 64, lonBands = 96) {
    const positions = [], normals = [], uvs = [], indices = [];
    for (let lat = 0; lat <= latBands; lat++) {
      const theta = lat * Math.PI / latBands;
      const sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);
      for (let lon = 0; lon <= lonBands; lon++) {
        const phi = lon * Math.PI * 2 / lonBands;
        const x = -Math.cos(phi) * sinTheta;
        const y = cosTheta;
        const z = Math.sin(phi) * sinTheta;
        positions.push(x, y, z);
        normals.push(x, y, z);
        uvs.push(lon / lonBands, lat / latBands);
      }
    }
    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const a = lat * (lonBands + 1) + lon;
        const b = a + lonBands + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices)
    };
  }

  if (!gl) {
    globeCanvas.style.display = 'none';
    fxCanvas.style.background = 'radial-gradient(circle at 79% 46%, rgba(77,220,255,.16), transparent 28%)';
    return;
  }

  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aUv;
    uniform float uRotation;
    uniform float uTilt;
    uniform float uScale;
    uniform float uAspect;
    uniform vec2 uCenter;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      float cy = cos(uRotation), sy = sin(uRotation);
      float cx = cos(uTilt), sx = sin(uTilt);
      vec3 p = vec3(
        aPosition.x * cy + aPosition.z * sy,
        aPosition.y,
        -aPosition.x * sy + aPosition.z * cy
      );
      vec3 n = vec3(
        aNormal.x * cy + aNormal.z * sy,
        aNormal.y,
        -aNormal.x * sy + aNormal.z * cy
      );
      p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
      n = vec3(n.x, n.y * cx - n.z * sx, n.y * sx + n.z * cx);
      gl_Position = vec4(
        uCenter.x + p.x * uScale / uAspect,
        uCenter.y + p.y * uScale,
        p.z * .08,
        1.0
      );
      vUv = aUv;
      vNormal = normalize(n);
    }
  `;

  const fragmentSource = `
    precision mediump float;
    uniform sampler2D uTexture;
    uniform float uLights;
    uniform float uAlpha;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vec4 sampleColor = texture2D(uTexture, vUv);
      float luminance = dot(sampleColor.rgb, vec3(.2126, .7152, .0722));
      vec3 nightBase = mix(sampleColor.rgb * vec3(.16, .28, .52), vec3(luminance * .17, luminance * .26, luminance * .42), .62);
      vec3 color = mix(nightBase, sampleColor.rgb, smoothstep(0.0, 1.0, uLights));
      vec3 lightDir = normalize(vec3(-.48, .54, .72));
      float key = max(dot(vNormal, lightDir), 0.0);
      float facing = max(vNormal.z, 0.0);
      float rim = pow(1.0 - facing, 3.5);
      color *= .37 + key * .67;
      color += vec3(.05, .43, .68) * rim * .28;
      color += vec3(.72, .0, .34) * rim * uLights * .09;
      gl_FragColor = vec4(color, uAlpha);
    }
  `;

  const program = programFrom(vertexSource, fragmentSource);
  const sphere = createSphere();
  const attributes = {
    position: gl.getAttribLocation(program, 'aPosition'),
    normal: gl.getAttribLocation(program, 'aNormal'),
    uv: gl.getAttribLocation(program, 'aUv')
  };
  const uniforms = {
    rotation: gl.getUniformLocation(program, 'uRotation'),
    tilt: gl.getUniformLocation(program, 'uTilt'),
    scale: gl.getUniformLocation(program, 'uScale'),
    aspect: gl.getUniformLocation(program, 'uAspect'),
    center: gl.getUniformLocation(program, 'uCenter'),
    lights: gl.getUniformLocation(program, 'uLights'),
    alpha: gl.getUniformLocation(program, 'uAlpha'),
    texture: gl.getUniformLocation(program, 'uTexture')
  };

  function bindArray(data, location, size) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }
  gl.useProgram(program);
  bindArray(sphere.positions, attributes.position, 3);
  bindArray(sphere.normals, attributes.normal, 3);
  bindArray(sphere.uvs, attributes.uv, 2);
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

  const texture = gl.createTexture();
  const image = new Image();
  image.src = 'assets/clickco-earth-night.png';
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    ready = true;
    startedAt = performance.now();
    requestAnimationFrame(render);
  };

  function resize() {
    w = innerWidth;
    h = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    sizeCanvas(globeCanvas, dpr);
    sizeCanvas(fxCanvas, dpr);
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gl.viewport(0, 0, globeCanvas.width, globeCanvas.height);
    drawStars();
  }

  function sceneAt(seconds) {
    if (reduced) {
      return { cx: w * .79, cy: h * .45, r: Math.min(w, h) * (w < 700 ? .42 : .39), lights: 1, alpha: 1, rotation: .92 };
    }
    if (seconds < 4.5) {
      const arrive = cinematic((seconds - .12) / 1.75);
      return {
        cx: w * .5,
        cy: h * .5,
        r: Math.min(w, h) * (.075 + .265 * arrive),
        lights: smooth((seconds - 1.65) / 1.55),
        alpha: 1,
        rotation: .42 + seconds * .14
      };
    }
    if (seconds < 5.7) {
      const zoom = cinematic((seconds - 4.5) / 1.2);
      return {
        cx: w * .5,
        cy: h * .5,
        r: Math.min(w, h) * (.34 + 2.18 * zoom),
        lights: 1,
        alpha: 1 - smooth((zoom - .73) / .27),
        rotation: 1.05 + (seconds - 4.5) * .16
      };
    }
    const settle = cinematic((seconds - 5.7) / 1.15);
    const targetX = w * .79;
    const targetY = h * (w < 700 ? .39 : .46);
    const targetR = Math.min(w, h) * (w < 700 ? .42 : .39);
    return {
      cx: w * .5 + (targetX - w * .5) * settle,
      cy: h * .5 + (targetY - h * .5) * settle,
      r: targetR * (.83 + .17 * settle),
      lights: 1,
      alpha: settle,
      rotation: 1.23 + (seconds - 5.7) * .055 + (mouse.x - .5) * .06
    };
  }

  function drawFlares(scene, seconds, hero) {
    fx.clearRect(0, 0, w, h);
    const tilt = -.14;
    const cr = Math.cos(scene.rotation), sr = Math.sin(scene.rotation);
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    for (let i = 0; i < regions.length; i++) {
      const point = regions[i];
      const lon = point.lon * Math.PI / 180;
      const lat = point.lat * Math.PI / 180;
      const cosLat = Math.cos(lat);
      const px = -Math.cos(lon) * cosLat;
      const py = Math.sin(lat);
      const pz = Math.sin(lon) * cosLat;
      const rx = px * cr + pz * sr;
      const rz = -px * sr + pz * cr;
      const ry = py * ct - rz * st;
      const front = py * st + rz * ct;
      if (front < .08) continue;
      const live = hero ? 1 : smooth((seconds - point.delay) / .42);
      if (live <= 0) continue;
      const x = scene.cx + rx * scene.r;
      const y = scene.cy - ry * scene.r;
      const breathe = .86 + .14 * Math.sin(seconds * 2.2 + i * .9);
      const radius = (3.8 + 7.5 * live) * (.72 + front * .42) * breathe;
      const glow = fx.createRadialGradient(x, y, 0, x, y, radius * 3.4);
      glow.addColorStop(0, `rgba(255,255,255,${.88 * live * front})`);
      glow.addColorStop(.11, `rgba(253,37,175,${.9 * live * front})`);
      glow.addColorStop(.36, `rgba(245,6,141,${.28 * live * front})`);
      glow.addColorStop(1, 'rgba(245,6,141,0)');
      fx.fillStyle = glow;
      fx.beginPath();
      fx.arc(x, y, radius * 3.4, 0, Math.PI * 2);
      fx.fill();
      if (!hero && live < .98) {
        fx.strokeStyle = `rgba(253,37,175,${(1 - live) * .72 * front})`;
        fx.lineWidth = 1;
        fx.beginPath();
        fx.arc(x, y, radius * (1.2 + live * 2.8), 0, Math.PI * 2);
        fx.stroke();
      }
    }
  }

  function render(now) {
    if (!ready) return;
    const seconds = reduced ? 8 : (now - startedAt) / 1000;
    const hero = seconds >= 5.7 || reduced;
    mouse.x += (mouse.tx - mouse.x) * .018;
    const scene = sceneAt(seconds);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniforms.texture, 0);
    gl.uniform1f(uniforms.rotation, scene.rotation);
    gl.uniform1f(uniforms.tilt, -.14);
    gl.uniform1f(uniforms.scale, scene.r / h * 2);
    gl.uniform1f(uniforms.aspect, w / h);
    gl.uniform2f(uniforms.center, scene.cx / w * 2 - 1, 1 - scene.cy / h * 2);
    gl.uniform1f(uniforms.lights, scene.lights);
    gl.uniform1f(uniforms.alpha, scene.alpha);
    gl.drawElements(gl.TRIANGLES, sphere.indices.length, gl.UNSIGNED_SHORT, 0);
    drawFlares(scene, seconds, hero);
    if (!reduced) requestAnimationFrame(render);
  }

  addEventListener('resize', resize, { passive: true });
  addEventListener('pointermove', event => { mouse.tx = event.clientX / Math.max(w, 1); }, { passive: true });
  resize();

  const glow = document.querySelector('.cursor-glow');
  if (matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', event => {
      glow.style.left = event.clientX + 'px';
      glow.style.top = event.clientY + 'px';
      glow.style.opacity = '1';
    }, { passive: true });
    document.querySelectorAll('.magnetic').forEach(element => {
      element.addEventListener('pointermove', event => {
        const box = element.getBoundingClientRect();
        const x = (event.clientX - box.left - box.width / 2) * .09;
        const y = (event.clientY - box.top - box.height / 2) * .13;
        element.style.transform = `translate(${x}px,${y}px)`;
      });
      element.addEventListener('pointerleave', () => { element.style.transform = ''; });
    });
  }
})();
