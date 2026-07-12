import { Store } from './store';

export interface MaterialPreset {
  id: string;
  name: string;
  engraveSpeed: number;        // mm/min
  engravePower: number;        // 0-100%
  cutSpeed: number;            // mm/min
  cutPower: number;            // 0-100%
  engraveAirflow?: number;     // 0-100%
  cutAirflow?: number;         // 0-100%
  maxDepthPerPass: number;     // mm (d_pass)
  lossCoeff: number;           // alpha
  supportedOps: ('engrave' | 'cut')[];
  notes: string;
}

const DEFAULT_MATERIALS: Record<string, MaterialPreset> = {
  pappel_sperrholz: {
    id: 'pappel_sperrholz',
    name: 'Pappelsperrholz',
    engraveSpeed: 4000,
    engravePower: 30,
    cutSpeed: 350,
    cutPower: 100,
    maxDepthPerPass: 5.0,
    lossCoeff: 0.15,
    engraveAirflow: 0,
    cutAirflow: 0,
    supportedOps: ['engrave', 'cut'],
    notes: 'Leichtes Bastelholz, schneidet bei 5mm Dicke in einem Durchgang mit 350mm/min bei 100% Leistung.'
  },
  birkensperrholz: {
    id: 'birkensperrholz',
    name: 'Birkensperrholz',
    engraveSpeed: 3500,
    engravePower: 35,
    cutSpeed: 150,
    cutPower: 100,
    maxDepthPerPass: 1.5,
    lossCoeff: 0.20,
    engraveAirflow: 0,
    cutAirflow: 100,
    supportedOps: ['engrave', 'cut'],
    notes: 'Härteres Holz mit höherem Leimanteil. Erfordert mehr Durchgänge.'
  },
  hartholz_eiche_buche: {
    id: 'hartholz_eiche_buche',
    name: 'Hartholz (Eiche/Buche)',
    engraveSpeed: 3000,
    engravePower: 45,
    cutSpeed: 120,
    cutPower: 100,
    maxDepthPerPass: 1.0,
    lossCoeff: 0.25,
    engraveAirflow: 0,
    cutAirflow: 100,
    supportedOps: ['engrave', 'cut'],
    notes: 'Sehr dichte Hölzer. Schnitte neigen bei zu geringer Geschwindigkeit zu starker Verkohlung.'
  },
  weichholz_balsa: {
    id: 'weichholz_balsa',
    name: 'Weichholz (Balsa)',
    engraveSpeed: 5000,
    engravePower: 20,
    cutSpeed: 450,
    cutPower: 100,
    maxDepthPerPass: 3.0,
    lossCoeff: 0.08,
    engraveAirflow: 0,
    cutAirflow: 50,
    supportedOps: ['engrave', 'cut'],
    notes: 'Sehr weich, verbrennt leicht. Sehr schnelles Schneiden möglich.'
  },
  weichholz_kiefer: {
    id: 'weichholz_kiefer',
    name: 'Weichholz (Kiefer)',
    engraveSpeed: 4000,
    engravePower: 25,
    cutSpeed: 250,
    cutPower: 100,
    maxDepthPerPass: 2.0,
    lossCoeff: 0.15,
    engraveAirflow: 0,
    cutAirflow: 0,
    supportedOps: ['engrave', 'cut'],
    notes: 'Harzhaltig, raucht stark. Air Assist zwingend empfohlen.'
  },
  mdf: {
    id: 'mdf',
    name: 'MDF / Pressspan',
    engraveSpeed: 5000,
    engravePower: 12,
    cutSpeed: 350,
    cutPower: 100,
    maxDepthPerPass: 1.0,
    lossCoeff: 0.15,
    engraveAirflow: 0,
    cutAirflow: 0,
    supportedOps: ['engrave', 'cut'],
    notes: 'Gleichmäßige Gravur bei hoher Geschwindigkeit, schnelles Schneiden vermindert Schmauchspuren.'
  },
  acryl_schwarz: {
    id: 'acryl_schwarz',
    name: 'Acryl (Schwarz/Opak)',
    engraveSpeed: 4000,
    engravePower: 25,
    cutSpeed: 150,
    cutPower: 100,
    maxDepthPerPass: 1.5,
    lossCoeff: 0.18,
    engraveAirflow: 0,
    cutAirflow: 100,
    supportedOps: ['engrave', 'cut'],
    notes: 'Opakes Acryl, schneidet sich gut. Genügend Lüftung empfohlen.'
  },
  glas: {
    id: 'glas',
    name: 'Glas (beschichtet)',
    engraveSpeed: 1500,
    engravePower: 70,
    cutSpeed: 0,
    cutPower: 0,
    maxDepthPerPass: 0,
    lossCoeff: 0,
    engraveAirflow: 0,
    cutAirflow: 0,
    supportedOps: ['engrave'],
    notes: 'Schneiden unmöglich. Gravieren nur mit Maskierung/Farbdeckung (wasserlöslich) möglich.'
  },
  edelstahl: {
    id: 'edelstahl',
    name: 'Edelstahl (Markierung)',
    engraveSpeed: 400,
    engravePower: 100,
    cutSpeed: 0,
    cutPower: 0,
    maxDepthPerPass: 0,
    lossCoeff: 0,
    engraveAirflow: 0,
    cutAirflow: 0,
    supportedOps: ['engrave'],
    notes: 'Schneiden unmöglich. Benötigt Metallmarkierspray (z. B. MoS2), das eingebrannt wird.'
  },
  leder: {
    id: 'leder',
    name: 'Leder (chromfrei)',
    engraveSpeed: 4000,
    engravePower: 20,
    cutSpeed: 350,
    cutPower: 100,
    maxDepthPerPass: 1.5,
    lossCoeff: 0.18,
    engraveAirflow: 0,
    cutAirflow: 50,
    supportedOps: ['engrave', 'cut'],
    notes: 'Nur chromfreies Naturleder verwenden. Riecht stark nach verbrannten Haaren.'
  },
  karton: {
    id: 'karton',
    name: 'Karton / Wellpappe',
    engraveSpeed: 5000,
    engravePower: 15,
    cutSpeed: 800,
    cutPower: 90,
    maxDepthPerPass: 3.0,
    lossCoeff: 0.05,
    engraveAirflow: 0,
    cutAirflow: 0,
    supportedOps: ['engrave', 'cut'],
    notes: 'Sehr leicht entflammbar. Hohe Geschwindigkeiten und niedrige Leistung wählen.'
  }
};

class MaterialsStore extends Store<Record<string, MaterialPreset>> {
  constructor() {
    const saved = localStorage.getItem('gravitylaser_materials');
    let initial = { ...DEFAULT_MATERIALS };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        initial = { ...parsed, pappel_sperrholz: DEFAULT_MATERIALS.pappel_sperrholz };
      } catch (e) {
        console.warn('Failed to load materials from localStorage', e);
      }
    }
    super(initial);
  }

  public updateMaterial(id: string, updates: Partial<MaterialPreset>) {
    this.update((state) => {
      if (!state[id]) return state;
      const newState = {
        ...state,
        [id]: {
          ...state[id],
          ...updates
        }
      };
      localStorage.setItem('gravitylaser_materials', JSON.stringify(newState));
      return newState;
    });
  }

  public addMaterial(material: MaterialPreset) {
    this.update((state) => {
      const newState = {
        ...state,
        [material.id]: material
      };
      localStorage.setItem('gravitylaser_materials', JSON.stringify(newState));
      return newState;
    });
  }

  public removeMaterial(id: string) {
    this.update((state) => {
      const newState = { ...state };
      delete newState[id];
      localStorage.setItem('gravitylaser_materials', JSON.stringify(newState));
      return newState;
    });
  }

  public resetToDefault() {
    this.set(DEFAULT_MATERIALS);
    localStorage.setItem('gravitylaser_materials', JSON.stringify(DEFAULT_MATERIALS));
  }
}

export const materialsStore = new MaterialsStore();

// Exportiere MATERIALS als Proxy zum materialsStore.get(), um volle Kompatibilität mit Altcode zu wahren.
export const MATERIALS = new Proxy({}, {
  get: (_, prop) => {
    return materialsStore.get()[prop as string];
  },
  ownKeys: () => {
    return Reflect.ownKeys(materialsStore.get());
  },
  getOwnPropertyDescriptor: (_, prop) => {
    return {
      enumerable: true,
      configurable: true,
      value: materialsStore.get()[prop as string]
    };
  }
}) as Record<string, MaterialPreset>;

/**
 * Berechnet die Anzahl der Durchgänge (Passes) für ein bestimmtes Material und Stärke
 * Formel: N = ceil( (d / d_pass) * (1 + alpha * (d - d_pass)) )
 */
export function calculatePasses(materialId: string, thickness: number): number {
  const mat = MATERIALS[materialId];
  if (!mat || thickness <= 0) return 1;
  if (!mat.supportedOps.includes('cut') || mat.maxDepthPerPass <= 0) return 1;

  const d = thickness;
  const dPass = mat.maxDepthPerPass;
  const alpha = mat.lossCoeff;

  if (d <= dPass) {
    return 1;
  }

  const rawPasses = (d / dPass) * (1 + alpha * (d - dPass));
  return Math.ceil(rawPasses);
}

/**
 * Berechnet die Schneideleistung (0-100%) basierend auf der Materialstärke.
 * Wenn das Material dünner als die maximale Schnitttiefe pro Durchgang (d_pass) ist,
 * wird die Leistung proportional reduziert (Skalierung nach unten), um Brandspuren an Ecken zu verhindern.
 * Die Mindestleistung beträgt 10% (damit der Laser zündet).
 */
export function calculateCutPower(mat: MaterialPreset, thickness: number): number {
  if (!mat || !mat.maxDepthPerPass || mat.maxDepthPerPass <= 0 || thickness <= 0) {
    return mat ? mat.cutPower : 100;
  }
  
  if (thickness < mat.maxDepthPerPass) {
    const scaled = Math.round(mat.cutPower * (thickness / mat.maxDepthPerPass));
    return Math.max(10, Math.min(mat.cutPower, scaled));
  }
  
  return mat.cutPower;
}
