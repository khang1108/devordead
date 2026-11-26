import type * as THREE from "three";

export type SceneKey =
  | "hero"
  | "fold"
  | "roadmap"
  | "code"
  | "ai"
  | "hr"
  | "clouds"
  | "offer";

export type ThemeMode = "dark" | "light";

export type PaletteName =
  | "sky"
  | "mono"
  | "blueprint"
  | "terminal"
  | "coral"
  | "forest";

export interface SceneTiming {
  readonly key: SceneKey;
  readonly start: number;
  readonly end: number;
}

export interface SceneModule {
  update: (t: number) => void;
  resize?: () => void;
}

export type SceneFactory = (root: HTMLElement) => SceneModule;

export type SceneRegistry = Record<SceneKey, SceneFactory>;

export interface DirectorAPI {
  update: (p: number) => void;
  resize: () => void;
}

export type RevealType = "chars" | "scramble" | "blur" | "type";

export interface RevealOptions {
  type?: RevealType;
}

export interface RevealController {
  set: (t: number) => void;
}

export interface TexturePaletteCSS {
  paper: string;
  paperInk: string;
  paperInk2: string;
  paperInk3: string;
  paperLine: string;
  paperRuleStrong: string;
  paperSoft: string;
  groundInk: string;
  groundMuted: string;
  accent: string;
  brand: string;
  emerald: string;
}

export interface PaletteConfig {
  darkTheme: boolean;
  bg: THREE.Color;
  bgDark: THREE.Color;
  ink: THREE.Color;
  ink2: THREE.Color;
  ink3: THREE.Color;
  accent: THREE.Color;
  brand: THREE.Color;
  onDark: THREE.Color;
  surface: THREE.Color;
  sky: THREE.Color;
  skyHigh: THREE.Color;
  paper: THREE.Color;
  emerald: THREE.Color;
  pearl: THREE.Color;
  ceramic: THREE.Color;
  capObsidian: THREE.Color;
  capCord: THREE.Color;
  runway: THREE.Color;
  runwayShoulder: THREE.Color;
  runwayLine: THREE.Color;
  draftGraphite: THREE.Color;
  draftActive: THREE.Color;
  ceramicPlate: THREE.Color;
  ceramicBack: THREE.Color;
  ceramicEdge: THREE.Color;
  wallToken: THREE.Color;
  wallDim: THREE.Color;
  wallLit: THREE.Color;
  orbBase: THREE.Color;
  orbPearl: THREE.Color;
  orbSky: THREE.Color;
  orbEmerald: THREE.Color;
  orbRing: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  rimDay: THREE.Color;
  rimNight: THREE.Color;
  shadow: THREE.Color;
  shadowOpacity: number;
  confetti: readonly [
    THREE.Color,
    THREE.Color,
    THREE.Color,
    THREE.Color,
    THREE.Color,
    THREE.Color,
  ];
  css: TexturePaletteCSS;
}

export interface WorldOptions {
  reducedMotion?: boolean;
}

export interface WorldAPI {
  renderer: THREE.WebGLRenderer;
  update: (p: number, rawTime: number) => void;
  resize: () => void;
  refreshPalette: () => void;
  setReducedMotion: (flag: boolean) => void;
  restartIntro: () => void;
}

export interface PaperPlaneOptions {
  cvTexture: THREE.Texture;
  offerTexture: THREE.Texture;
}

export interface PaperPlaneTextures {
  cv: THREE.Texture;
  offer: THREE.Texture;
}

export interface PaperPlaneAPI {
  group: THREE.Group;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  material: THREE.MeshStandardMaterial;
  setFold: (f: number, flutter?: number) => void;
  getWingTipOffsets: (
    f: number,
    outLeft: THREE.Vector3,
    outRight: THREE.Vector3,
  ) => void;
  useOffer: (on: boolean) => void;
  setPaperLift: (amount: number) => void;
  setTextures: (textures: PaperPlaneTextures, isOffer: boolean) => void;
  size: { readonly W: number; readonly L: number };
}

export type WingTrailSampler = (
  p: number,
  outLeft: THREE.Vector3,
  outRight: THREE.Vector3,
) => void;

export interface WingTrailsAPI {
  group: THREE.Group;
  update: (
    p: number,
    opacity: number,
    darkWeight: number,
    camPos: THREE.Vector3,
    sampleAt: WingTrailSampler,
    spanP?: number,
  ) => void;
  setPalette: (nextPal: PaletteConfig) => void;
}

export type CapObject = THREE.Group & {
  setPose: (toss: number, drop: number, time?: number) => void;
  setPalette: (nextPal: PaletteConfig) => void;
};

export interface FlightMapUpdateParams {
  runway: number;
  map: number;
  branches: number;
  travel: number;
}

export interface FlightMapAPI {
  group: THREE.Group;
  flight: THREE.CurvePath<THREE.Vector3>;
  update: (params: FlightMapUpdateParams) => void;
  setPalette: (nextPal: PaletteConfig) => void;
  runwayLength: number;
  flightLength: number;
}

export interface CodeWallAPI {
  group: THREE.Group;
  update: (t: number) => void;
  setPalette: (nextPal: PaletteConfig) => void;
}

export interface OrbAPI {
  group: THREE.Group;
  update: (time: number, talk: number, visible: number) => void;
  setPalette: (nextPal: PaletteConfig) => void;
}

export interface CloudsOptions {
  center: THREE.Vector3;
  spanZ?: number;
  count?: number;
}

export interface CloudsAPI {
  group: THREE.Group;
  update: (visible: number, time?: number) => void;
}

export interface ConfettiAPI {
  mesh: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  update: (t: number) => void;
  setPalette: (nextPal: PaletteConfig) => void;
}

export interface LabelTextureOptions {
  dark?: boolean;
}

export interface LabelTextureResult {
  texture: THREE.CanvasTexture;
  aspect: number;
}

export type RGBTuple = [number, number, number];
export type EaseFn = (t: number) => number;
export type Keyframe<T> = readonly [number, T];
