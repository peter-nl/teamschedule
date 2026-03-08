import { Component, Inject, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { SlideInPanelRef, SLIDE_IN_PANEL_DATA } from '../services/slide-in-panel.service';

export interface CropImageDialogData {
  imageDataUrl: string;
}

@Component({
  selector: 'app-crop-image-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
    MatDividerModule,
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <div class="slide-in-panel">
      <div class="panel-header">
        <h2>
          <mat-icon>crop</mat-icon>
          {{ 'editMember.cropTitle' | translate }}
        </h2>
        <button class="panel-close" (click)="panelRef.close(null)">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <div class="panel-content">
        <p class="crop-hint">{{ 'editMember.cropHint' | translate }}</p>

        <div class="crop-area"
             [class.dragging]="isDragging"
             (mousedown)="onMouseDown($event)"
             (touchstart)="onTouchStart($event)"
             (touchmove)="onTouchMove($event)"
             (touchend)="onTouchEnd()"
             (wheel)="onWheel($event)">
          <img #imgEl
               [src]="safeImageUrl"
               class="crop-img"
               [style.transform]="imgTransform"
               (load)="onImageLoad(imgEl)"
               crossorigin="anonymous"
               draggable="false"
               alt="">
          <div class="crop-overlay"></div>
          <div class="crop-border"></div>
        </div>

        <div class="zoom-row">
          <button mat-icon-button (click)="adjustZoom(-0.15)" [matTooltip]="'schedule.zoomOut' | translate">
            <mat-icon>zoom_out</mat-icon>
          </button>
          <mat-slider min="0.1" max="4" step="0.01" class="zoom-slider">
            <input matSliderThumb [ngModel]="scale" (ngModelChange)="onScaleChange($event)">
          </mat-slider>
          <button mat-icon-button (click)="adjustZoom(0.15)" [matTooltip]="'schedule.zoomIn' | translate">
            <mat-icon>zoom_in</mat-icon>
          </button>
        </div>

        <button mat-stroked-button (click)="triggerNewPhoto()" class="change-photo-btn">
          <mat-icon>upload</mat-icon>
          {{ 'editMember.changePhoto' | translate }}
        </button>
        <input #fileInput type="file" accept="image/*" style="display:none"
               (change)="onNewFileSelected($event)">
      </div>

      <div class="panel-actions">
        <span class="spacer"></span>
        <button mat-icon-button (click)="panelRef.close(null)"
                [matTooltip]="'common.cancel' | translate">
          <mat-icon>close</mat-icon>
        </button>
        <button mat-icon-button color="primary" (click)="cropAndSave()"
                [matTooltip]="'common.save' | translate">
          <mat-icon>check</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .panel-header {
      display: flex;
      align-items: center;
      padding: 12px 8px 12px 20px;
      flex-shrink: 0;
    }

    .panel-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      flex: 1;
      color: var(--mat-sys-on-surface);
    }

    .panel-header h2 mat-icon {
      color: var(--mat-sys-primary);
    }

    .panel-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      color: var(--mat-sys-on-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .panel-close:hover {
      background: var(--mat-sys-surface-container-highest);
    }

    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .crop-hint {
      margin: 0;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
    }

    .crop-area {
      position: relative;
      width: 300px;
      height: 300px;
      overflow: hidden;
      background: #111;
      cursor: grab;
      border-radius: 8px;
      flex-shrink: 0;
      user-select: none;
    }

    .crop-area.dragging {
      cursor: grabbing;
    }

    .crop-img {
      position: absolute;
      top: 50%;
      left: 50%;
      transform-origin: center center;
      user-select: none;
      pointer-events: none;
      max-width: none;
    }

    .crop-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      pointer-events: none;
      mask-image: radial-gradient(circle 120px at 50% 50%, transparent 119px, black 120px);
      -webkit-mask-image: radial-gradient(circle 120px at 50% 50%, transparent 119px, black 120px);
    }

    .crop-border {
      position: absolute;
      width: 240px;
      height: 240px;
      left: 30px;
      top: 30px;
      border: 2px solid rgba(255, 255, 255, 0.85);
      border-radius: 50%;
      pointer-events: none;
    }

    .zoom-row {
      display: flex;
      align-items: center;
      gap: 0;
      width: 300px;
    }

    .zoom-slider {
      flex: 1;
    }

    .change-photo-btn {
      width: 300px;
    }

    .panel-actions {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      border-top: 1px solid var(--mat-sys-outline-variant);
      flex-shrink: 0;
    }

    .spacer { flex: 1; }
  `]
})
export class CropImageDialogComponent implements OnDestroy {
  @ViewChild('imgEl') imgElRef!: ElementRef<HTMLImageElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  readonly CIRCLE = 240;

  // safeImageUrl is a stable property — only recreated when the URL actually changes.
  // Using a getter that calls bypassSecurityTrustUrl() on every CD cycle would return
  // a new object each time, causing Angular to re-set [src], which re-fires (load)
  // and resets scale/offset.
  safeImageUrl: SafeUrl | string;
  private currentImageUrl: string;

  // imgTransform is an explicit string property updated whenever scale/offset changes.
  // Using a getter would work for CD, but explicit updates are simpler to reason about.
  imgTransform = 'translate(-50%, -50%) scale(1)';

  scale = 1;
  offsetX = 0;
  offsetY = 0;
  isDragging = false;
  lastX = 0;
  lastY = 0;

  private boundMouseMove = this.onGlobalMouseMove.bind(this);
  private boundMouseUp = this.onGlobalMouseUp.bind(this);

  constructor(
    public panelRef: SlideInPanelRef<CropImageDialogComponent, string | null>,
    @Inject(SLIDE_IN_PANEL_DATA) public data: CropImageDialogData,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {
    this.currentImageUrl = data.imageDataUrl;
    this.safeImageUrl = this.toSafeUrl(this.currentImageUrl);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private toSafeUrl(url: string): SafeUrl | string {
    return url.startsWith('data:') ? this.sanitizer.bypassSecurityTrustUrl(url) : url;
  }

  private updateTransform(): void {
    this.imgTransform = `translate(calc(-50% + ${this.offsetX}px), calc(-50% + ${this.offsetY}px)) scale(${this.scale})`;
  }

  onImageLoad(img: HTMLImageElement): void {
    this.scale = Math.max(this.CIRCLE / img.naturalWidth, this.CIRCLE / img.naturalHeight);
    this.offsetX = 0;
    this.offsetY = 0;
    this.updateTransform();
  }

  onScaleChange(value: number): void {
    this.scale = value;
    this.updateTransform();
  }

  adjustZoom(delta: number): void {
    this.scale = Math.max(0.1, Math.min(4, this.scale + delta));
    this.updateTransform();
  }

  onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    e.preventDefault();
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private onGlobalMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.offsetX += e.clientX - this.lastX;
    this.offsetY += e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.updateTransform();
    this.cdr.detectChanges();
  }

  private onGlobalMouseUp(): void {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    this.cdr.detectChanges();
  }

  onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    this.isDragging = true;
    this.lastX = e.touches[0].clientX;
    this.lastY = e.touches[0].clientY;
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    this.offsetX += e.touches[0].clientX - this.lastX;
    this.offsetY += e.touches[0].clientY - this.lastY;
    this.lastX = e.touches[0].clientX;
    this.lastY = e.touches[0].clientY;
    this.updateTransform();
  }

  onTouchEnd(): void {
    this.isDragging = false;
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    this.scale = Math.max(0.1, Math.min(4, this.scale + delta));
    this.updateTransform();
  }

  triggerNewPhoto(): void {
    this.fileInputRef.nativeElement.click();
  }

  onNewFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.currentImageUrl = reader.result as string;
      this.safeImageUrl = this.toSafeUrl(this.currentImageUrl);
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }

  cropAndSave(): void {
    const img = this.imgElRef.nativeElement;
    const size = this.CIRCLE;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    const drawX = size / 2 + this.offsetX - img.naturalWidth * this.scale / 2;
    const drawY = size / 2 + this.offsetY - img.naturalHeight * this.scale / 2;
    ctx.drawImage(img, drawX, drawY, img.naturalWidth * this.scale, img.naturalHeight * this.scale);

    this.panelRef.close(canvas.toDataURL('image/jpeg', 0.88));
  }
}
