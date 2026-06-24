export const INSTRUCTOR_LAYOUT_STYLES = `
  .app {
    width: 100%;
    max-width: 100%;
    min-height: 100dvh;
    height: 100dvh;
    max-height: 100dvh;
    background: #08080f;
    font-family: 'Exo 2','Segoe UI',sans-serif;
    position: relative;
    overflow: hidden;
    border-radius: 0;
    border: none;
    display: flex;
    flex-direction: column;
    box-shadow: none;
  }

  .content-scroll,
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    margin-top: calc(-1 * var(--ins-logo-size, 96px) / 2);
    padding-top: calc(var(--ins-logo-size, 96px) / 2 + 10px);
    padding-bottom: calc(95px + env(safe-area-inset-bottom, 0px));
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .content-scroll::-webkit-scrollbar,
  .scroll::-webkit-scrollbar {
    display: none;
  }
`;
