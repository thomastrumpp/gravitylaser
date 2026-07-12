declare module 'polygon-offset' {
  export default class Offset {
    constructor();
    data(points: [number, number][]): this;
    margin(value: number): [number, number][][];
    padding(value: number): [number, number][][];
    offset(value: number): [number, number][][];
    arcSegments(value: number): this;
  }
}
