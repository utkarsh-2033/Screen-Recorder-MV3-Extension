export class DrawingTools {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private color = '#ef4444';
  private thickness = 4;
  private enabled = false;

  constructor() {}

  public toggle(): void {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.init();
    } else {
      this.destroy();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setColor(color: string): void {
    this.color = color;
  }

  public setThickness(thickness: number): void {
    this.thickness = thickness;
  }

  public clear(): void {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private init(): void {
    if (this.canvas) return;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'clipiq-drawing-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.inset = '0';
    this.canvas.style.zIndex = '2147483645'; // Just below controls and bubble
    this.canvas.style.pointerEvents = 'auto'; // Capture clicks
    this.canvas.style.cursor = 'crosshair';
    
    // Set exact dimensions
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));

    this.ctx = this.canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }

    document.body.appendChild(this.canvas);
    this.attachEvents();
  }

  private destroy(): void {
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }
    window.removeEventListener('resize', this.resize.bind(this));
  }

  private resize(): void {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.ctx) {
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }
  }

  private attachEvents(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDrawing = true;
      if (!this.ctx) return;
      this.ctx.beginPath();
      this.ctx.moveTo(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDrawing || !this.ctx) return;
      this.ctx.lineTo(e.clientX, e.clientY);
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = this.thickness;
      this.ctx.stroke();
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDrawing = false;
      if (this.ctx) this.ctx.closePath();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDrawing = false;
      if (this.ctx) this.ctx.closePath();
    });
  }
}
