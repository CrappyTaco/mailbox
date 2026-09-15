// Mechanical atlas slicing, registration, palette reduction and alpha cleanup.
// No interpolation: finished sprites contain only opaque palette pixels.
import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [atlasArg, landscapeArg] = process.argv.slice(2);
if (!atlasArg || !landscapeArg) throw new Error('Supply the generated atlas and landscape PNG paths.');
const out = resolve('public/world');
await mkdir(out, { recursive: true });
await mkdir('.local/art-source', { recursive: true });
await copyFile(atlasArg, '.local/art-source/world-atlas.png');
await copyFile(landscapeArg, '.local/art-source/world-landscape.png');
const palette = ['252238','39465b','4b568e','596fb0','7891c5','adc0d1','d6d9df','bd4760','df8090','814f5d','a47179','526449','809866','adc08b','f4e9ce','d1b598','a68a78','e3b859'];
const rgb = palette.map(h => [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)));
async function reduce(input, width, height, sky = false) {
 const {data,info}=await sharp(input).resize(width,height,{kernel:'nearest',fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4) {
  const [r,g,b,a] = data.subarray(i,i+4);
  if(a<180 || (sky && b>g*1.06 && b>r*1.05 && b>100)) { data.fill(0,i,i+4); continue; }
  let best=0, distance=Infinity;
  rgb.forEach((color,j)=>{ const d=color.reduce((sum,c,k)=>sum+(c-data[i+k])**2,0); if(d<distance){distance=d;best=j;} });
  data.set([...rgb[best],255],i);
 }
 // Remove isolated quantization specks without softening the integer edges.
 const cleaned=Buffer.from(data);
 for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++) {
  const i=(y*width+x)*4;
  if(data[i+3]===0) continue;
  const colors=new Map();
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
   const j=((y+dy)*width+x+dx)*4;
   if(data[j+3]!==255) continue;
   const key=data.readUInt32BE(j); colors.set(key,(colors.get(key)||0)+1);
  }
  const current=data.readUInt32BE(i);
  if((colors.get(current)||0)>1) continue;
  const best=[...colors].sort((a,b)=>b[1]-a[1])[0];
  if(best && best[1]>=5) cleaned.writeUInt32BE(best[0],i);
 }
 return sharp(cleaned,{raw:info}).png().toBuffer();
}
const crop=(left,top,width,height)=>sharp(atlasArg).extract({left,top,width,height}).png().toBuffer();
// Every state shares the same body, post, flag-hinge and door anchors.
// Registration removes the small camera/scale drift in the generated atlas.
/** @typedef {[number,number,number,number]} Crop */
/** @type {Array<[string,Crop,Crop|null,Crop,Crop|null]>} */
const states = [
 ['open-up',[80,122,295,210],[80,326,145,125],[226,329,63,110],[241,30,94,99]],
 ['closed-up',[504,122,282,213],null,[636,330,64,110],[649,30,94,99]],
 ['closed-down',[900,122,316,214],null,[1029,330,65,110],null],
 ['open-down',[80,522,312,207],[80,724,141,130],[220,727,61,110],null],
];
for (const [name,body,door,post,flag] of states) {
 const layers=[];
 const add=async (box,w,h,left,top)=>layers.push({input:await reduce(await crop(...box),w,h),left,top});
 await add(post,20,35,50,96);
 // Down flags extend to the right; preserve that extra width beyond the body.
 await add(body,name.endsWith('down')?100:94,67,6,30);
 if(door) await add(door,46,40,6,95);
 if(flag) await add(flag,30,32,57,1);
 const input=await sharp({create:{width:112,height:134,channels:4,background:'#00000000'}}).composite(layers).png().toBuffer();
 await writeFile(resolve(out,`mailbox-${name}.png`),input);
}
/** @type {Array<[string,Crop,number,number]>} */
const decorations = [
 ['cloud',[32,952,366,245],64,40],
 ['moon',[478,905,292,300],32,32],
 ['flowers',[903,927,294,273],32,30],
];
for(const [name,box,w,h] of decorations) await writeFile(resolve(out,`${name}.png`),await reduce(await crop(...box),w,h));
await writeFile(resolve(out,'landscape.png'),await reduce(landscapeArg,640,360,true));
const sheet=await sharp({create:{width:896,height:268,channels:4,background:'#d9dfd7'}}).composite(await Promise.all(states.map(async([name],i)=>({input:await sharp(resolve(out,`mailbox-${name}.png`)).resize(224,268,{kernel:'nearest'}).toBuffer(),left:i*224,top:0})))).png().toBuffer();
await writeFile('.local/art-source/registered-states.png',sheet);
console.log('Saved four registered mailbox states, cloud, moon, flowers and landscape.');
