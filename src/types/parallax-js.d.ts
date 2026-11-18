declare module 'parallax-js' {
  interface ParallaxInstance {
    destroy(): void;
    enable(): void;
    disable(): void;
  }

  interface ParallaxConstructor {
    new (
      element: HTMLElement,
      options?: Record<string, unknown>,
    ): ParallaxInstance;
  }

  const Parallax: ParallaxConstructor;
  export default Parallax;
}
