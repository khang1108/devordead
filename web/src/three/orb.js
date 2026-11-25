import * as THREE from "three";

// Simplex noise 3D (Ashima Arts / Stefan Gustavson, MIT) — dùng ở tần số rất thấp & biên độ cực nhỏ cho nhịp thở êm
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

// Biên độ dao động giảm ~85% (idle 0.008, speaking 0.024) để mặt cầu tròn mịn như gốm ngọc trai, không bao giờ nhăn/sần
const coreVert = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vDir;
  varying float vBreath;
  ${NOISE}

  float dispField(vec3 d) {
    float n1 = snoise(d * 0.85 + vec3(0.0, uTime * 0.22, uTime * 0.12));
    float harm = sin(d.y * 2.8 - uTime * 1.9) * 0.35;
    return (n1 + harm) * uAmp;
  }

  void main() {
    vec3 dir = normalize(normal);
    float baseR = length(position);
    float eps = 0.03;

    vec3 upRef = abs(dir.y) < 0.98 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 t1 = normalize(cross(upRef, dir));
    vec3 t2 = cross(dir, t1);

    float h0 = dispField(dir);
    float h1 = dispField(normalize(dir + t1 * eps));
    float h2 = dispField(normalize(dir + t2 * eps));

    vec3 p0 = dir * (baseR + h0);
    vec3 p1 = normalize(dir + t1 * eps) * (baseR + h1);
    vec3 p2 = normalize(dir + t2 * eps) * (baseR + h2);

    vec3 nLocal = normalize(cross(p1 - p0, p2 - p0));
    if (dot(nLocal, dir) < 0.0) nLocal = -nLocal;

    vDir = dir;
    vBreath = clamp(h0 / max(uAmp, 0.0001), -1.0, 1.0);
    vec4 world = modelMatrix * vec4(p0, 1.0);
    vPosW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * nLocal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// Vật liệu Matte-Ceramic / Frosted Acoustic Pearl điềm tĩnh:
// Đỉnh đón sáng ngọc trai (#F0F4F8) -> tán xạ ngầm Sky tiết chế (#2484B5) & thoáng lục bảo (#16794C) -> bóng tối #111418.
const coreFrag = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uPearl;
  uniform vec3 uSky;
  uniform vec3 uEmerald;
  uniform float uTalk;
  uniform float uGlow;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vDir;
  varying float vBreath;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float ndv = max(dot(N, V), 0.0);

    // Đèn chính Studio mềm chiếu từ góc trên-trái phía camera
    vec3 keyDir = normalize(vec3(-0.38, 0.72, -0.58));
    float keyWrap = clamp(dot(N, keyDir) * 0.5 + 0.5, 0.0, 1.0);
    float softDiff = pow(keyWrap, 1.65);

    // Tán xạ ngầm êm dịu giữa vùng sáng ngọc trai và vùng tối obsidian
    vec3 subTone = mix(uSky, uEmerald, uTalk * 0.28);
    float midMask = smoothstep(0.12, 0.62, keyWrap) * (1.0 - smoothstep(0.62, 0.96, keyWrap));

    vec3 col = mix(uBase, uPearl * 0.86, softDiff * 0.82);
    col += subTone * (midMask * (0.22 + 0.14 * uTalk) + max(0.0, vBreath) * 0.06);

    // Viền sáng Fresnel mờ như gốm phủ sương (frosted rim)
    float fresnel = pow(1.0 - ndv, 3.1);
    vec3 rimTone = mix(subTone, uPearl, 0.68);
    col += rimTone * fresnel * (0.36 + 0.14 * uTalk);

    // Bắt sáng satin rộng êm (matte-satin sheen, không gắt)
    vec3 H = normalize(keyDir + V);
    float sheen = pow(max(dot(N, H), 0.0), 16.0);
    col += uPearl * sheen * 0.18;

    col *= uGlow;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Quả cầu điêu khắc trung tâm "AI Interviewer" (Calm Matte-Pearl Acoustic Sphere):
 * - Bề mặt cầu tròn trịa mịn màng, nhịp thở sóng hài tần số thấp tinh tế,
 * - Kèm duy nhất 1 vòng chỉ mảnh (whisper-thin hairline orbital ring, opacity <= 0.16),
 * - Xóa bỏ hoàn toàn bụi sao, đĩa Sao Thổ nhiều vòng và khung dây đa sắc rối mắt.
 * - Tuyệt đối 0% tím / violet / lavender.
 */
export function createOrb(pal) {
  let PAL = pal;
  const group = new THREE.Group();

  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.01 },
    uTalk: { value: 0.35 },
    uGlow: { value: 1 },
    uBase: { value: PAL.orbBase.clone() },
    uPearl: { value: PAL.orbPearl.clone() },
    uSky: { value: PAL.orbSky.clone() },
    uEmerald: { value: PAL.orbEmerald.clone() },
  };

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.76, 64),
    new THREE.ShaderMaterial({
      vertexShader: coreVert,
      fragmentShader: coreFrag,
      uniforms,
    }),
  );
  group.add(core);

  // Duy nhất 1 vòng chỉ mảnh tinh tế (whisper-thin studio hairline ring, opacity <= 0.16)
  const ringHolder = new THREE.Group();
  ringHolder.rotation.set(0.42, 0.18, -0.16);
  const ringMat = new THREE.MeshBasicMaterial({
    color: PAL.orbRing.clone(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const hairlineRing = new THREE.Mesh(new THREE.TorusGeometry(2.86, 0.0065, 12, 160), ringMat);
  ringHolder.add(hairlineRing);
  group.add(ringHolder);

  /** time: giây; talk: 0..1 độ "đang nói"; visible: 0..1 độ hiện. */
  function update(time, talk, visible) {
    group.visible = visible > 0.001;
    if (!group.visible) return;

    const voice = 0.5 + 0.5 * Math.sin(time * 5.2) * Math.sin(time * 2.3 + 0.9);
    uniforms.uTime.value = time;
    uniforms.uTalk.value = talk;
    // Biên độ siêu mượt: 0.008 khi nghỉ, tối đa ~0.032 khi đang nói
    uniforms.uAmp.value = 0.008 + talk * (0.010 + 0.014 * voice);
    uniforms.uGlow.value = visible;

    ringHolder.rotation.z = -0.16 + Math.sin(time * 0.25) * 0.035;
    ringMat.opacity = 0.15 * visible;

    group.scale.setScalar(0.76 + 0.24 * visible);
  }

  function setPalette(nextPal) {
    PAL = nextPal;
    uniforms.uBase.value.copy(PAL.orbBase);
    uniforms.uPearl.value.copy(PAL.orbPearl);
    uniforms.uSky.value.copy(PAL.orbSky);
    uniforms.uEmerald.value.copy(PAL.orbEmerald);
    ringMat.color.copy(PAL.orbRing);
  }

  return { group, update, setPalette };
}
