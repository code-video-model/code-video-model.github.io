// The recorded variant is selected by a real entry file. Never rewrite the
// shared implementation to pretend its default initializer changed on disk.
export function codePresentation(files,variant,runtimeParameters={}){
 const selected=variant==null?'':String(variant);
 const entry=selected?files.find(file=>file.generated_adapter&&file.text.includes(`setVariant(${JSON.stringify(selected)})`)):null;
 if(selected&&!entry)throw new Error('The selected variant has no matching source entry');
 const parameters=new URLSearchParams(runtimeParameters).toString();
 return {files:entry?[entry,...files.filter(file=>file!==entry)]:files,
  label:file=>file===entry?`Active entry · variant ${selected}`:file.name||file.path,
  note:file=>entry?(file===entry?`Active variant ${selected} · recorded selection entry`:`Shared implementation · variant ${selected} is selected by the active entry; default initializers are overridden`):parameters?`Current case source · active runtime: ${parameters}`:'Current case source · highlights follow scene time'};
}
