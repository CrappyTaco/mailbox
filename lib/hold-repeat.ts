// One hold is one history transaction. Every release/cancel path calls stop.
export class HoldRepeat {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private active = false;
  constructor(
    private step: () => void,
    private begin: () => void,
    private end: () => void,
  ) {}
  configure(step: () => void, begin: () => void, end: () => void) {
    this.step = step;
    this.begin = begin;
    this.end = end;
  }
  start() {
    if (this.active) return;
    this.active = true;
    this.begin();
    this.step();
    const repeat = () => {
      if (!this.active) return;
      this.step();
      this.timer = setTimeout(repeat, 50);
    };
    this.timer = setTimeout(repeat, 280);
  }
  stop() {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.active) {
      this.active = false;
      this.end();
    }
  }
}
