import {
  Component, Input, Output, EventEmitter, ElementRef,
  OnDestroy, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy,
  ChangeDetectorRef, ViewChild, TemplateRef, ViewContainerRef,
  ViewEncapsulation
} from '@angular/core';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal, PortalModule } from '@angular/cdk/portal';
import 'vanilla-colorful/hex-color-picker.js';

@Component({
  selector: 'app-color-swatch',
  standalone: true,
  imports: [OverlayModule, PortalModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <button class="cs-btn"
            [class.cs-btn-dark]="dark"
            [style.background-color]="color"
            (click)="toggle($event)"
            type="button">
    </button>

    <ng-template #tpl>
      <div class="cs-popup" (click)="$event.stopPropagation()">
        <hex-color-picker
          [color]="color"
          (color-changed)="onColorChanged($event)">
        </hex-color-picker>
      </div>
    </ng-template>
  `,
  styles: [`
    app-color-swatch {
      display: block;
      width: 40px;
      height: 40px;
    }

    .cs-btn {
      display: block;
      width: 40px;
      height: 40px;
      border: 2px solid rgba(0, 0, 0, 0.15);
      border-radius: 6px;
      cursor: pointer;
      padding: 0;
    }

    .cs-btn-dark {
      border-color: rgba(255, 255, 255, 0.2);
    }

    .cs-popup {
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 6px 28px rgba(0, 0, 0, 0.25);
      padding: 10px;
    }

    hex-color-picker {
      display: block;
      width: 200px;
    }
  `]
})
export class ColorSwatchComponent implements OnDestroy {
  @Input() color = '#000000';
  @Input() dark = false;
  @Output() colorChange = new EventEmitter<string>();

  @ViewChild('tpl') tpl!: TemplateRef<void>;

  private overlayRef: OverlayRef | null = null;

  constructor(
    private overlay: Overlay,
    private elRef: ElementRef<HTMLElement>,
    private vcr: ViewContainerRef,
    private cdr: ChangeDetectorRef
  ) {}

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.overlayRef ? this.close() : this.open();
  }

  private open(): void {
    const strategy = this.overlay.position()
      .flexibleConnectedTo(this.elRef)
      .withPositions([
        { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
        { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy: strategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.overlayRef.attach(new TemplatePortal(this.tpl, this.vcr));
  }

  close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }

  onColorChanged(event: Event): void {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    this.color = value;
    this.colorChange.emit(value);
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.close();
  }
}
