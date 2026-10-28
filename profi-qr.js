// Self-contained byte-mode QR v9-L encoder for spectator URLs (up to 230 UTF-8 bytes).
// QR graphics are created entirely on the organizer's device, never via external servers.
export function qrMatrix(value){
 const bytes=new TextEncoder().encode(value),version=9,n=53,DATA=232;
 if(bytes.length>230)throw Error('Zuschauerlink zu lang für den QR-Code.');
 const bits=[];function put(v,count){for(let i=count-1;i>=0;i--)bits.push((v>>>i)&1)}
 put(4,4);put(bytes.length,8);for(const byte of bytes)put(byte,8);
 for(let i=0;i<Math.min(4,DATA*8-bits.length);i++)bits.push(0);
 while(bits.length%8)bits.push(0);
 const data=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((a,b)=>(a<<1)|b,0));
 while(data.length<DATA)data.push(data.length%2===0?0xec:0x11);
 const blocks=[data.slice(0,116),data.slice(116)];
 function mul(a,b){let x=0;while(b){if(b&1)x^=a;a=(a<<1)^((a&128)?0x11d:0);b>>>=1}return x}
 function pow(a,p){let v=1;while(p--)v=mul(v,a);return v}
 function rs(src){let gen=[1];for(let i=0;i<30;i++){const next=Array(gen.length+1).fill(0);for(let j=0;j<gen.length;j++){next[j]^=gen[j];next[j+1]^=mul(gen[j],pow(2,i))}gen=next}
  const out=Array(30).fill(0);for(const b of src){const x=b^out.shift();out.push(0);for(let k=0;k<30;k++)out[k]^=mul(gen[k+1],x)}return out}
 const ecb=blocks.map(rs),all=[];
 for(let i=0;i<116;i++)for(const block of blocks)all.push(block[i]);
 for(let i=0;i<30;i++)for(const block of ecb)all.push(block[i]);
 const m=Array.from({length:n},()=>Array(n).fill(false)),used=Array.from({length:n},()=>Array(n).fill(false));
 function set(x,y,b){if(x<0||y<0||x>=n||y>=n)return;m[y][x]=!!b;used[y][x]=true}
 function finder(x,y){for(let j=-1;j<=7;j++)for(let i=-1;i<=7;i++)set(x+i,y+j,i>=0&&i<=6&&j>=0&&j<=6&&(i===0||i===6||j===0||j===6||(i>=2&&i<=4&&j>=2&&j<=4)))}
 finder(0,0);finder(n-7,0);finder(0,n-7);
 for(let i=8;i<n-8;i++){set(i,6,i%2===0);set(6,i,i%2===0)}
 for(const ay of [6,26,46])for(const ax of [6,26,46]){
  if((ax===6&&ay===6)||(ax===6&&ay===46)||(ax===46&&ay===6))continue;
  for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++)set(ax+i,ay+j,Math.max(Math.abs(i),Math.abs(j))!==1);
 }
 for(let i=0;i<9;i++){if(i!==6){set(8,i,false);set(i,8,false)}}
 for(let i=0;i<8;i++){set(n-1-i,8,false);set(8,n-1-i,false)}
 set(8,n-8,true);
 function bch(value,poly){let v=value,deg=31-Math.clz32(poly);while(v&&(31-Math.clz32(v))>=deg)v^=poly<<((31-Math.clz32(v))-deg);return v}
 const ver=(version<<12)|bch(version<<12,0x1f25);
 for(let i=0;i<18;i++){const bit=(ver>>>i)&1,a=n-11+(i%3),b=Math.floor(i/3);set(a,b,bit);set(b,a,bit)}
 let cursor=0,up=true;
 for(let right=n-1;right>=1;right-=2){if(right===6)right=5;
  for(let off=0;off<n;off++){const y=up?n-1-off:off;for(let x=right;x>=right-1;x--){if(used[y][x])continue;const byte=all[Math.floor(cursor/8)]||0,bit=(byte >>> (7-cursor%8))&1;set(x,y,Boolean(bit)^((x+y)%2===0));cursor++}}up=!up;
 }
 const info=1<<3,format=((info<<10)|bch(info<<10,0x537))^0x5412;
 for(let i=0;i<15;i++){
  const bit=(format>>>i)&1;
  if(i<6)set(8,i,bit);else if(i<8)set(8,i+1,bit);else set(8,n-15+i,bit);
  if(i<8)set(n-1-i,8,bit);else if(i===8)set(7,8,bit);else set(14-i,8,bit);
 }
 set(8,n-8,true);return m;
}
export function qrSvg(url){
 const m=qrMatrix(url),n=m.length,size=n+8;
 // Explicit white quiet zone and simple rects scan reliably with offline camera software.
 let out='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+size+' '+size+'" width="100%" height="100%" role="img" aria-label="QR-Code für die neutrale Live-Turnieransicht"><rect width="'+size+'" height="'+size+'" fill="#fff"/>';
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(m[y][x])out+='<rect x="'+(x+4)+'" y="'+(y+4)+'" width="1" height="1" fill="#000"/>';
 return out+'</svg>';
}
