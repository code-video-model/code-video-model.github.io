import "./case/runtime.mjs";
const api = window.reconstruction;
const source = document.querySelector("#proxy");
if (!api?.seek || !source) throw new Error('Missing composite scene output');
const display = document.createElement('canvas');
display.width = 960; display.height = 540;
const context = display.getContext('2d');
const originalSeek = api.seek.bind(api);
api.displayCanvas = display;
api.seek = time => {
  originalSeek(time);
  if (!window.__bfSampling) context.drawImage(source, 0, 0, display.width, display.height);
};
api.seek(0);
