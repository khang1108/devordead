import * as THREE from "three";
import { rng } from "./util.js";

// Simplex noise 3D (Ashima Arts / Stefan Gustavson, MIT)
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying float vNoise;
  ${NOISE}
  void main() {
    float n = snoise(normal * 1.4 + vec3(0.0, uTime * 0.35, 0.0));
    float n2 = snoise(normal * 4.2 - vec3(uTime * 0.6));
    vNoise = n;
    vec3 p = position + normal * (n * uAmp + n2 * uAmp * 0.3);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vPosW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const frag = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uRim;
  uniform vec3 uAccent;
  uniform float uGlow;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying float vNoise;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosW);
    float fres = pow(1.0 - max(dot(normalize(vNormalW), viewDir), 0.0), 2.8);
    vec3 rim = mix(uRim, uAccent, smoothstep(0.25, 0.9, vNoise));
    // dải sáng mảnh chạy theo nhiễu — gợi sóng âm
    float band = smoothstep(0.02, 0.0, abs(fract(vNoise * 3.0 + 0.5) - 0.5) - 0.46);
    vec3 col = uBase + rim * fres * uGlow + mix(uRim, uAccent, 0.5) * band * 0.12 * uGlow;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Quả cầu "AI Interviewer": bề mặt dao động theo nhiễu, viền sáng fresnel, vỏ hạt bụi quanh. */
export function createOrb(pal) {
  const group = new THREE.Group();
  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.15 },
    uGlow: { value: 1 },
    uBase: { value: pal.orbBase.clone() },
    uRim: { value: pal.onDark.clone() },
    uAccent: { value: pal.brand.clone() },
  };
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.8, 48),
    new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms }),
  );
  group.add(core);

  // vỏ hạt
  const r = rng(5);
  const N = 900;
  const pts = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const rad = 3.0 + r() * 2.2;
    const s = Math.sqrt(1 - u * u);
    pts.set([rad * s * Math.cos(th), rad * u, rad * s * Math.sin(th)], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: pal.orbDust, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false }),
  );
  group.add(dust);

  /** time: giây; talk: 0..1 độ "đang nói"; visible: 0..1 độ hiện. */
  function update(time, talk, visible) {
    uniforms.uTime.value = time;
    // nói = biên độ dao động theo nhịp giả lập giọng
    const voice = 0.5 + 0.5 * Math.sin(time * 9.0) * Math.sin(time * 3.7 + 1.3);
    uniforms.uAmp.value = 0.08 + talk * (0.12 + 0.18 * voice);
    uniforms.uGlow.value = visible;
    group.scale.setScalar(0.6 + 0.4 * visible);
    dust.rotation.y = time * 0.05;
    dust.material.opacity = 0.7 * visible;
    group.visible = visible > 0.001;
  }
  return { group, update };
}
