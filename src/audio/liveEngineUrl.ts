// Where the live engine's AudioWorklet module is served (Vite bundles engineProcessor.ts and its engine core into one
// worker file). Imported only when the manifest names a grain table (audio.ts), so nothing else loads it.
import url from './engineProcessor.ts?worker&url';

export default url;
