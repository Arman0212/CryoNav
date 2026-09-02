/* useWebGLSupport — detects whether a real WebGL context can be created.

   Roughly a tenth of visitors (locked-down machines, old drivers, some
   VMs, blocklisted GPUs) cannot run WebGL. Rather than showing them a
   blank canvas, the landing page falls back to the editorial version of
   the story. Returns null while probing, then true/false. */

import { useEffect, useState } from 'react';

export function useWebGLSupport() {
  const [supported, setSupported] = useState(null);

  useEffect(() => {
    let ok = false;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      ok = Boolean(gl);
      // Release the probe context immediately
      const lose = gl && gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch {
      ok = false;
    }
    setSupported(ok);
  }, []);

  return supported;
}

export default useWebGLSupport;
