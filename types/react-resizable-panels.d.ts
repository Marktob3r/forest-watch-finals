declare module 'react-resizable-panels' {
  import * as React from 'react';

  export const PanelGroup: React.ComponentType<any>;
  export const Panel: React.ComponentType<any>;
  export const PanelResizeHandle: React.ComponentType<any>;

  export default {
    PanelGroup: PanelGroup as any,
    Panel: Panel as any,
    PanelResizeHandle: PanelResizeHandle as any,
  };
}
