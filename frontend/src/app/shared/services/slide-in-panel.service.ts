import { Injectable, Injector, Type, InjectionToken } from '@angular/core';
import { Overlay, OverlayRef, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Subject, Observable } from 'rxjs';

// Injection token for panel data (like MAT_DIALOG_DATA)
export const SLIDE_IN_PANEL_DATA = new InjectionToken<any>('SLIDE_IN_PANEL_DATA');

export interface SlideInPanelConfig<D = any> {
  data?: D;
  width?: string;
  /** Left offset (e.g. '220px'). Panel fills from this offset to the right edge. Backdrop also starts here. */
  leftOffset?: string;
  panelClass?: string | string[];
}

export class SlideInPanelRef<T, R = any> {
  private _afterClosedSubject = new Subject<R | undefined>();
  componentInstance!: T;

  constructor(
    private overlayRef: OverlayRef
  ) {}

  afterClosed(): Observable<R | undefined> {
    return this._afterClosedSubject.asObservable();
  }

  close(result?: R): void {
    // Trigger slide-out animation
    const panelElement = this.overlayRef.overlayElement.querySelector('.slide-in-panel');
    if (panelElement) {
      panelElement.classList.add('closing');
    }
    this.overlayRef.overlayElement.classList.add('closing');

    // Wait for animation then destroy
    setTimeout(() => {
      this._afterClosedSubject.next(result);
      this._afterClosedSubject.complete();
      this.overlayRef.dispose();
    }, 300); // Match CSS animation duration
  }
}

@Injectable({ providedIn: 'root' })
export class SlideInPanelService {
  private panelStack: SlideInPanelRef<any>[] = [];

  constructor(
    private overlay: Overlay,
    private injector: Injector
  ) {}

  open<T, D = any, R = any>(
    component: Type<T>,
    config: SlideInPanelConfig<D> = {}
  ): SlideInPanelRef<T, R> {
    const overlayRef = this.createOverlay(config);
    const panelRef = new SlideInPanelRef<T, R>(overlayRef);

    this.attachComponent(overlayRef, component, config, panelRef);
    this.panelStack.push(panelRef);

    // When leftOffset is set, shift backdrop and overlay wrapper so navigation stays visible
    if (config.leftOffset) {
      const backdropEl = overlayRef.backdropElement;
      if (backdropEl) {
        backdropEl.style.left = config.leftOffset;
      }
      const wrapper = overlayRef.overlayElement.parentElement;
      if (wrapper) {
        wrapper.style.left = config.leftOffset;
      }
    }

    // Handle backdrop click
    overlayRef.backdropClick().subscribe(() => {
      panelRef.close();
    });

    // Handle ESC key (only for topmost panel)
    overlayRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape' && this.isTopmost(panelRef)) {
        panelRef.close();
      }
    });

    // Remove from stack when closed
    panelRef.afterClosed().subscribe(() => {
      const index = this.panelStack.indexOf(panelRef);
      if (index > -1) {
        this.panelStack.splice(index, 1);
      }
    });

    return panelRef;
  }

  private createOverlay(config: SlideInPanelConfig): OverlayRef {
    const panelClasses = ['slide-in-panel-pane'];
    if (config.panelClass) {
      if (Array.isArray(config.panelClass)) {
        panelClasses.push(...config.panelClass);
      } else {
        panelClasses.push(config.panelClass);
      }
    }

    const useFullWidth = !!config.leftOffset;

    const positionStrategy = this.overlay.position()
      .global()
      .top('0')
      .bottom('0')
      .right('0');

    if (useFullWidth) {
      positionStrategy.left(config.leftOffset!);
    }

    const overlayConfig = new OverlayConfig({
      hasBackdrop: true,
      backdropClass: ['slide-in-panel-backdrop', `panel-level-${this.panelStack.length}`],
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      width: useFullWidth ? '100%' : (config.width || '480px'),
      maxWidth: useFullWidth ? '100%' : '95vw',
      panelClass: panelClasses
    });

    return this.overlay.create(overlayConfig);
  }

  private attachComponent<T, D, R>(
    overlayRef: OverlayRef,
    component: Type<T>,
    config: SlideInPanelConfig<D>,
    panelRef: SlideInPanelRef<T, R>
  ): void {
    const injector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: SLIDE_IN_PANEL_DATA, useValue: config.data },
        { provide: SlideInPanelRef, useValue: panelRef }
      ]
    });

    const portal = new ComponentPortal(component, null, injector);
    const componentRef = overlayRef.attach(portal);
    panelRef.componentInstance = componentRef.instance;
  }

  private isTopmost(panelRef: SlideInPanelRef<any>): boolean {
    return this.panelStack.length > 0 &&
           this.panelStack[this.panelStack.length - 1] === panelRef;
  }
}
