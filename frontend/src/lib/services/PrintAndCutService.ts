/**
 * PrintAndCutService — Berechnet die affine Registrierungsmatrix für vorgedrucktes Material
 * anhand von 2 Passmarken (Fadenkreuzen) im Design und auf der physischen Maschine.
 */

export interface Point {
  x: number;
  y: number;
}

export class PrintAndCutService {
  private static p1Design: Point | null = null;
  private static p2Design: Point | null = null;
  private static p1Machine: Point | null = null;
  private static p2Machine: Point | null = null;
  
  private static enabled = false;
  private static useScale = false; // Rigid-body standardmäßig (keine Skalierung)

  public static setDesignPoints(p1: Point, p2: Point) {
    this.p1Design = p1;
    this.p2Design = p2;
  }

  public static setMachinePoints(p1: Point, p2: Point) {
    this.p1Machine = p1;
    this.p2Machine = p2;
  }

  public static setEnabled(val: boolean) {
    this.enabled = val;
  }

  public static setUseScale(val: boolean) {
    this.useScale = val;
  }

  public static isEnabled(): boolean {
    return this.enabled && !!this.p1Design && !!this.p2Design && !!this.p1Machine && !!this.p2Machine;
  }

  public static getPoints() {
    return {
      p1Design: this.p1Design,
      p2Design: this.p2Design,
      p1Machine: this.p1Machine,
      p2Machine: this.p2Machine,
      enabled: this.enabled,
      useScale: this.useScale
    };
  }

  public static reset() {
    this.p1Design = null;
    this.p2Design = null;
    this.p1Machine = null;
    this.p2Machine = null;
    this.enabled = false;
  }

  /**
   * Berechnet die Transformation von Design-Koordinaten (Canvas) in Maschinen-Koordinaten
   */
  public static transform(x: number, y: number): Point {
    if (!this.p1Design || !this.p2Design || !this.p1Machine || !this.p2Machine) {
      return { x, y };
    }

    const dX_d = this.p2Design.x - this.p1Design.x;
    const dY_d = this.p2Design.y - this.p1Design.y;
    const dX_m = this.p2Machine.x - this.p1Machine.x;
    const dY_m = this.p2Machine.y - this.p1Machine.y;

    // Winkel berechnen
    const angleDesign = Math.atan2(dY_d, dX_d);
    const angleMachine = Math.atan2(dY_m, dX_m);
    const theta = angleMachine - angleDesign;

    // Skalierungsfaktor berechnen
    let scale = 1.0;
    if (this.useScale) {
      const distDesign = Math.sqrt(dX_d * dX_d + dY_d * dY_d);
      const distMachine = Math.sqrt(dX_m * dX_m + dY_m * dY_m);
      if (distDesign > 0.001) {
        scale = distMachine / distDesign;
      }
    }

    // Rotations- und Skalierungsmatrix
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Verschiebung des Designpunkts relativ zur ersten Passmarke P1
    const relX = x - this.p1Design.x;
    const relY = y - this.p1Design.y;

    // Transformation anwenden
    const transX = scale * (relX * cosT - relY * sinT);
    const transY = scale * (relX * sinT + relY * cosT);

    // Auf physische P1_m Position aufaddieren
    return {
      x: this.p1Machine.x + transX,
      y: this.p1Machine.y + transY
    };
  }
}
