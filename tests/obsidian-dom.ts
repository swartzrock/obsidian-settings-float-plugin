export function installObsidianDomHelpers(): void {
  if (!HTMLElement.prototype.setCssStyles) {
    Object.defineProperty(HTMLElement.prototype, "setCssStyles", {
      configurable: true,
      value(this: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
        Object.assign(this.style, styles);
      },
    });
  }

  if (!HTMLElement.prototype.setCssProps) {
    Object.defineProperty(HTMLElement.prototype, "setCssProps", {
      configurable: true,
      value(this: HTMLElement, props: Record<string, string>): void {
        for (const [name, value] of Object.entries(props)) {
          this.style.setProperty(name, value);
        }
      },
    });
  }
}
