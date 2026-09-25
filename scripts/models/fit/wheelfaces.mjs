// Both faces of each wheel file: from +X (the face that goes outward) and from -X, plus its box.
import { join } from 'node:path';
export default async ({ ev, save, R, args }) => {
  for (const f of args) {
    const info = await ev(`window.assemble({ wheel: '/f${join(R, f)}', wheelR: 0.3, wheels: [[0, 0.3, 0]] })`);
    const a = await ev(`window.persp([1, 0.15, 0.1], { size: [500, 500], fill: 0.85 })`);
    const b = await ev(`window.persp([-1, 0.15, 0.1], { size: [500, 500], fill: 0.85 })`);
    const c = await ev(`window.persp([0.2, 0.15, 1], { size: [500, 500], fill: 0.85 })`);
    const sheet = await ev(`(async () => { const ims = await Promise.all(${JSON.stringify([a, b, c])}.map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; })));
      const cv = document.createElement('canvas'); cv.width = 1500; cv.height = 500; const g = cv.getContext('2d'); ims.forEach((im, k) => g.drawImage(im, k * 500, 0));
      g.font = 'bold 22px sans-serif'; g.fillStyle = '#c00'; g.fillText('${f}: from +X (outer face)', 10, 30); g.fillText('from -X', 510, 30); g.fillText('tread', 1010, 30); return cv.toDataURL('image/jpeg', 0.88); })()`);
    save(join(R, f.replace('.glb', '-faces.jpg')), sheet);
    console.log(f, JSON.stringify(info));
  }
};
