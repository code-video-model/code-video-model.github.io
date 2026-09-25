import {normalizeDisplayIdentifiers} from './code-display-names.mjs';

// The recorded variant is selected by a real entry file. Never rewrite the
// shared implementation to pretend its default initializer changed on disk.
export function codePresentation(files,variant,runtimeParameters={},displayNames={}){
 const selected=variant==null?'':String(variant);
 const entry=selected?files.find(file=>file.generated_adapter&&file.text.includes(`setVariant(${JSON.stringify(selected)})`)):null;
 if(selected&&!entry)throw new Error('The selected variant has no matching source entry');
 const selectedName=displayNames[selected]||selected;
 const presented=files.map(file=>({...file,text:normalizeDisplayIdentifiers(file.text,displayNames)}));
 const presentedEntry=entry?presented[files.indexOf(entry)]:null;
 const ordered=presentedEntry?[presentedEntry,...presented.filter(file=>file!==presentedEntry)]:presented;
 const parameters=normalizeDisplayIdentifiers(new URLSearchParams(runtimeParameters).toString(),displayNames);
 return {files:ordered,
  label:file=>file===presentedEntry?`Active entry · ${selectedName}`:file.name||file.path,
  note:file=>presentedEntry?(file===presentedEntry?`Active variant ${selectedName} · recorded selection entry`:`Shared implementation · ${selectedName} is selected by the active entry; default initializers are overridden`):parameters?`Current case source · active runtime: ${parameters}`:'Current case source · highlights follow scene time'};
}
