(()=>{'use strict';
const W=763,H=515,S=4,$=s=>document.querySelector(s),form=$('#guest-form'),canvas=$('#preview'),ctx=canvas.getContext('2d'),overlay=document.createElement('canvas');overlay.width=W*S;overlay.height=H*S;const oc=overlay.getContext('2d');
const image=new Image(),mark=new Image();let ready=false,busy=false,pdfBytes=null,lastMetrics=[];
let prepared=null,prepareTimer=null,revision=0,lastKey=null;
const clean=v=>v.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
const state=()=>({name:clean($('#guest-name').value),address1:clean($('#address1').value),address2:clean($('#address2').value),family:$('#family').checked,language:$('input[name=language]:checked').value,ink:$('input[name=ink]:checked').value,glitter:$('#glitter').checked,natural:$('#natural').checked});
function filename(name){return 'Wedding_Invitation_'+(name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').replace(/\s+/g,'_').replace(/[. ]+$/g,'').slice(0,100)||'Guest')+'.pdf'}
function fontFor(text){return /[\u0900-\u097f]/.test(text)?'Kalam, KalamLatin':'Caveat, KalamLatin'}
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
function hashText(s){let h=2166136261;for(const ch of s){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0}
const graphemes=typeof Intl!=='undefined'&&Intl.Segmenter?new Intl.Segmenter('hi',{granularity:'grapheme'}):null;
// Natural handwriting: small seeded variation per word and letter, so repeated letters never look identical.
// Devanagari letters keep one baseline so the shirorekha and conjuncts stay joined.
function drawNatural(lc,text,x,baseline,size,family,maxWidth){
 const r=random(hashText(text)),R=(a,b)=>a+(b-a)*r(),hi=/[ऀ-ॿ]/.test(text),slope=R(-.01,.01),words=[];let total=0;
 lc.font=`${size}px ${family}`;
 for(const part of text.split(/(\s+)/)){
  if(!part)continue;
  if(/^\s+$/.test(part)){const adv=lc.measureText(part).width*R(.85,1.2);words.push({space:adv});total+=adv;continue}
  const w={ws:size*R(.95,1.05),dy:R(-.04,.04)*size,rot:R(-.025,.025),cl:[],adv:0};
  const parts=graphemes?[...graphemes.segment(part)].map(s=>s.segment):[part];
  for(const g of parts){lc.font=`${w.ws}px ${family}`;const sx=R(.94,1.06),ls=hi?1:R(.93,1.07),adv=lc.measureText(g).width*sx*ls;
   w.cl.push({g,sx,ls,dy:hi?0:R(-.035,.035)*size,rot:hi?0:R(-.05,.05),alpha:R(.8,1),lw:R(0,.55)});w.adv+=adv*1}
  words.push(w);total+=w.adv;
 }
 const f=total>maxWidth?maxWidth/total*.98:1;lc.save();lc.translate(x,baseline);lc.scale(f,f);let cx=0;
 for(const w of words){
  if(w.space!==undefined){cx+=w.space;continue}
  lc.save();lc.translate(cx,w.dy+cx*slope);lc.rotate(w.rot);let wx=0;
  for(const c of w.cl){lc.font=`${w.ws}px ${family}`;const adv=lc.measureText(c.g).width;
   lc.save();lc.translate(wx,c.dy);lc.rotate(c.rot);lc.scale(c.sx*c.ls,c.ls);lc.globalAlpha=c.alpha;lc.fillText(c.g,0,0);
   if(c.lw>.12){lc.lineWidth=c.lw;lc.strokeStyle=lc.fillStyle;lc.strokeText(c.g,0,0)}lc.restore();wx+=adv*c.sx*c.ls}
  lc.restore();cx+=w.adv;
 }
 lc.restore();lc.globalAlpha=1;
}
function write(text,x,baseline,width,size,st,kind){if(!text)return;
 const layer=document.createElement('canvas');layer.width=W*S;layer.height=H*S;const lc=layer.getContext('2d');lc.scale(S,S);lc.textBaseline='alphabetic';let metrics;
 // Fit visible ink bounds, including Devanagari vowel marks, within each ruled line.
 for(let n=0;n<4;n++){lc.font=`${size}px ${fontFor(text)}`;metrics=lc.measureText(text);const extent=Math.max(metrics.width,metrics.actualBoundingBoxRight+Math.max(0,metrics.actualBoundingBoxLeft));if(extent<=width)break;size*=width/extent*.985;}
 lc.font=`${size}px ${fontFor(text)}`;metrics=lc.measureText(text);const inkWidth=Math.max(metrics.width,metrics.actualBoundingBoxRight+Math.max(0,metrics.actualBoundingBoxLeft));const rule={name:266.5,address1:303.5,address2:339.5}[kind];if(rule)baseline=Math.min(baseline,rule-3-metrics.actualBoundingBoxDescent);const top=baseline-metrics.actualBoundingBoxAscent,bottom=baseline+metrics.actualBoundingBoxDescent;
 const base=st.ink==='red'?'#981c26':'#4c1522';lc.fillStyle=base;if(st.natural&&kind!=='family')drawNatural(lc,text,x+Math.max(0,metrics.actualBoundingBoxLeft),baseline,size,fontFor(text),width);else lc.fillText(text,x+Math.max(0,metrics.actualBoundingBoxLeft),baseline);
 if(st.glitter){lc.globalCompositeOperation='source-atop';const g=lc.createLinearGradient(0,top,0,bottom);g.addColorStop(0,st.ink==='red'?'#b93136':'#6b2231');g.addColorStop(.40,base);g.addColorStop(.48,st.ink==='red'?'#c55b48':'#8d4043');g.addColorStop(.56,base);g.addColorStop(1,st.ink==='red'?'#ae2629':'#591b2c');lc.fillStyle=g;lc.fillRect(x-1,top-1,width+3,bottom-top+3);
 const rnd=random(1739+Math.round(x*baseline));for(let i=0;i<width*(bottom-top)*1.2;i++){const px=x+rnd()*width,py=top+rnd()*(bottom-top);lc.fillStyle=i%12===0?'#fff0be':i%3===0?'#c99665':'#f3c49b';lc.globalAlpha=i%12===0?.86:.40;const r=i%12===0?.48:.24;lc.fillRect(px,py,r,r);}lc.globalAlpha=1;lc.globalCompositeOperation='source-over';}
 oc.drawImage(layer,0,0);lastMetrics.push({kind,text,size,x,top,bottom,right:x+inkWidth,maxRight:x+width});
}
function render(){if(!ready)return;const st=state();lastMetrics=[];oc.clearRect(0,0,overlay.width,overlay.height);oc.drawImage(mark,645*S,30*S,100*S,50*S);
 // Coordinates measured from the uploaded, unmodified 763 x 515 point PDF.
 // Baselines sit above all three printed rules; room is reserved for descenders.
 const hindi=/[\u0900-\u097f]/.test(st.name);write(st.name,468,261,205,hindi?20:25,st,'name');
 write(st.address1,485,298,190,/[\u0900-\u097f]/.test(st.address1)?18:23,st,'address1');
 write(st.address2,497,334,181,/[\u0900-\u097f]/.test(st.address2)?18:23,st,'address2');
 if(st.family&&st.name)write(st.language==='hi'?'(सपरिवार)':'(With family)',433,225,104,st.language==='hi'?12:15,st,'family');
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);ctx.drawImage(overlay,0,0);
 $('#filename').textContent=st.name?filename(st.name):'फाइल का नाम मेहमान के नाम पर होगा';
 const small=lastMetrics.some(m=>m.size<11);$('#fit-note').textContent=small?'यह विवरण बहुत लंबा है; अच्छी readability के लिए छोटा करें।':'लंबा नाम उपलब्ध जगह में अपने-आप फिट होगा।';
 queuePdf(st);$('#preview').setAttribute('aria-label',st.name?`Invitation for ${st.name}${st.family?', with family':''}`:'Original invitation preview');
}
function showError(message){$('#error').textContent=message;$('#error').hidden=!message}

// Literal phonetic Hindi input. No dictionary, name correction, or network requests.
// Vowels: a/aa/i/ee/u/oo/e/ai/o/au; conjuncts preserve typed consonant order.
const hindiCommonWords={"ji":"जी","jee":"जी","aap":"आप","ap":"आप","aapka":"आपका","aapki":"आपकी","aapke":"आपके","apka":"आपका","apki":"आपकी","apke":"आपके","aapko":"आपको","aapse":"आपसे","aapne":"आपने","ka":"का","ki":"की","ke":"के","ko":"को","hai":"है","hain":"हैं","mein":"में","main":"मैं","hum":"हम","ham":"हम","hamara":"हमारा","hamari":"हमारी","hamare":"हमारे","tum":"तुम","tumhara":"तुम्हारा","mera":"मेरा","meri":"मेरी","mere":"मेरे","ye":"ये","yeh":"यह","yah":"यह","woh":"वह","vah":"वह","aur":"और","bhi":"भी","nahi":"नहीं","nahin":"नहीं","haan":"हाँ","han":"हाँ","se":"से","par":"पर","tak":"तक","sab":"सब","sabhi":"सभी","namaste":"नमस्ते","namaskar":"नमस्कार","dhanyavad":"धन्यवाद","dhanyavaad":"धन्यवाद","kripya":"कृपया","kripaya":"कृपया","shri":"श्री","sri":"श्री","shree":"श्री","shrimati":"श्रीमती","srimati":"श्रीमती","shreemati":"श्रीमती","shriman":"श्रीमान","sahab":"साहब","saheb":"साहब","sahib":"साहिब","saparivar":"सपरिवार","saparivaar":"सपरिवार","parivar":"परिवार","parivaar":"परिवार","sahit":"सहित","evam":"एवं","tatha":"तथा","aadarniya":"आदरणीय","adarniya":"आदरणीय","priya":"प्रिय","sadar":"सादर","saadar":"सादर","aamantran":"आमंत्रण","amantran":"आमंत्रण","nimantran":"निमंत्रण","vivah":"विवाह","vivaah":"विवाह","shubh":"शुभ","shaadi":"शादी","shadi":"शादी","padhare":"पधारें","padharen":"पधारें","swagat":"स्वागत","aagman":"आगमन","nagar":"नगर","colony":"कॉलोनी","koloni":"कॉलोनी","gali":"गली","marg":"मार्ग","maarg":"मार्ग","road":"रोड","gaon":"गाँव","gram":"ग्राम","graam":"ग्राम","mohalla":"मोहल्ला","zilla":"ज़िला","jila":"जिला","jilaa":"जिला","tehsil":"तहसील","tahsil":"तहसील","post":"पोस्ट","ward":"वार्ड","house":"हाउस","flat":"फ्लैट","near":"नियर","mandir":"मंदिर","jaipur":"जयपुर","alwar":"अलवर","bharatpur":"भरतपुर","rajasthan":"राजस्थान","delhi":"दिल्ली","dilli":"दिल्ली","agra":"आगरा","mumbai":"मुंबई","harsh":"हर्ष","pulkit":"पुलकित","varsha":"वर्षा","sharma":"शर्मा","gupta":"गुप्ता","verma":"वर्मा","varma":"वर्मा","goyal":"गोयल","agarwal":"अग्रवाल","agrawal":"अग्रवाल","raj":"राज","rajesh":"राजेश","rakesh":"राकेश","suresh":"सुरेश","mahesh":"महेश","dinesh":"दिनेश","ramesh":"रमेश","mukesh":"मुकेश","naresh":"नरेश","sanjay":"संजय","vijay":"विजय","ajay":"अजय","amit":"अमित","sumit":"सुमित","sunil":"सुनील","anil":"अनिल","rahul":"राहुल","rohit":"रोहित","mohit":"मोहित","sonam":"सोनम","aman":"अमन","kumar":"कुमार","kumari":"कुमारी","devi":"देवी","singh":"सिंह"};
function romanToHindi(word){
 const known=hindiCommonWords[word.toLowerCase()];if(typeof known==='string')return known;
 const vowels={aa:['आ','ा'],ee:['ई','ी'],ii:['ई','ी'],oo:['ऊ','ू'],uu:['ऊ','ू'],ai:['ऐ','ै'],au:['औ','ौ'],a:['अ',''],i:['इ','ि'],u:['उ','ु'],e:['ए','े'],o:['ओ','ो']};
 const consonants={rsh:'र्ष',ksh:'क्ष',chh:'छ',kh:'ख',gh:'घ',ch:'च',jh:'झ',th:'थ',dh:'ध',ph:'फ',bh:'भ',sh:'श',ny:'ञ',k:'क',g:'ग',c:'क',j:'ज',t:'त',d:'द',n:'न',p:'प',b:'ब',m:'म',y:'य',r:'र',l:'ल',v:'व',w:'व',s:'स',h:'ह',f:'फ़',z:'ज़',q:'क़',x:'क्स'};
 const src=word.toLowerCase();let out='',pending=false;
 for(let i=0;i<src.length;){
  let token='';for(const n of [3,2,1]){const part=src.slice(i,i+n);if(vowels[part]||consonants[part]){token=part;break}}
  if(!token){out+=src[i++];pending=false;continue}
  if(vowels[token]){out+=vowels[token][pending?1:0];pending=false}
  else if(!pending&&out&&(token==='n'||token==='m')&&/^[kgcjtdpbs]/.test(src.slice(i+1))){out+='ं'}
  else{if(pending)out+='्';out+=consonants[token];pending=true}
  i+=token.length;
 }
 return out.normalize('NFC');
}
function convertBeforeCaret(input){
 if(state().language!=='hi'||input.selectionStart!==input.selectionEnd)return false;
 const end=input.selectionStart,before=input.value.slice(0,end),match=before.match(/[A-Za-z]+$/);
 if(!match)return false;
 const start=end-match[0].length,replacement=romanToHindi(match[0]);
 input.setRangeText(replacement,start,end,'end');return true;
}
const suggestionCache=new Map(),fields=[];
async function getHindiChoices(word){
 const key=word.toLowerCase();if(suggestionCache.has(key))return suggestionCache.get(key);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{
  const query=new URLSearchParams({text:word,itc:'hi-t-i0-und',num:'5',cp:'0',cs:'1',ie:'utf-8',oe:'utf-8'});
  const response=await fetch('https://inputtools.google.com/request?'+query,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw Error('Suggestions unavailable');
  const data=await response.json();if(data[0]!=='SUCCESS')throw Error('Suggestions unavailable');
  const choices=[...new Set(data[1]?.[0]?.[1]||[])].filter(s=>typeof s==='string'&&/[ऀ-ॿ]/.test(s)).slice(0,5);
  if(!choices.length)throw Error('No Hindi suggestions');
  suggestionCache.set(key,choices);return choices;
 }finally{clearTimeout(timer)}
}
// Same Google phonetic engine for name (whole phrase) and address (word by word, so digits, commas and typed Hindi stay untouched).
const letterNames={a:'ए',b:'बी',c:'सी',d:'डी',e:'ई',f:'एफ',g:'जी',h:'एच',i:'आई',j:'जे',k:'के',l:'एल',m:'एम',n:'एन',o:'ओ',p:'पी',q:'क्यू',r:'आर',s:'एस',t:'टी',u:'यू',v:'वी',w:'डब्ल्यू',x:'एक्स',y:'वाई',z:'ज़ेड'};
function hindiField({input,box,status,re,sep,idle,done,offline,fallback,letters}){
 let timer=null,rev=0,cur=null,active=0;
 const f={input,box,status,idle,hide,reset};fields.push(f);
 function token(){const end=input.selectionStart;if(end!==input.selectionEnd)return null;const m=input.value.slice(0,end).match(re);return m?{word:m[0],start:end-m[0].length,end,value:input.value}:null}
 function hide(){box.replaceChildren();box.hidden=true;cur=null}
 function reset(){clearTimeout(timer);++rev;hide()}
 function choose(index){
  const e=cur;if(!e||input.value!==e.value||state().language!=='hi')return;
  input.focus();input.setRangeText(e.choices[index],e.start,e.end,'end');hide();status.textContent=done;input.dispatchEvent(new Event('input',{bubbles:true}));
 }
 function show(t,choices){
  cur={...t,choices};active=0;box.replaceChildren();box.hidden=false;
  choices.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.textContent=c;b.className='text-button';b.style.cssText='padding:8px 12px;border:1px solid #dbc4c8;border-radius:8px;margin:3px;background:#fff;color:#721e33';
  b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',()=>choose(i));box.append(b)});
 }
 function replace(t,text){
  const s=input.selectionStart,e=input.selectionEnd,focused=document.activeElement===input;
  input.setRangeText(text,t.start,t.end,'preserve');const d=text.length-(t.end-t.start);
  if(focused)input.setSelectionRange(s>=t.end?s+d:s,e>=t.end?e+d:e);
  input.dispatchEvent(new Event('input',{bubbles:true}));
 }
 function replaceAll(t,text){
  if(!/^[A-Za-z]+$/.test(t.word)||!fallback){const ok=input.value.slice(t.start,t.end)===t.word;if(ok)replace(t,text);return ok}
  // Fast typing: earlier replacements shift offsets, so convert every finished copy of this word.
  const val=input.value,focused=document.activeElement===input,s0=input.selectionStart,e0=input.selectionEnd;let out='',last=0,s1=s0,e1=e0,hit=false;
  for(const m of val.matchAll(/[A-Za-z]+/g)){
   const end=m.index+m[0].length;if(m[0].toLowerCase()!==t.word.toLowerCase()||focused&&end===e0&&e0===s0&&end===val.length)continue;
   out+=val.slice(last,m.index)+text;last=end;hit=true;const d=text.length-m[0].length;if(end<=s0)s1+=d;if(end<=e0)e1+=d;
  }
  if(!hit)return false;
  input.value=out+val.slice(last);if(focused)input.setSelectionRange(s1,e1);input.dispatchEvent(new Event('input',{bubbles:true}));return true;
 }
 async function suggest(t,commit=false,expected=t.value){
  const r=++rev;status.textContent='Hindi सुझाव आ रहे हैं…';
  try{
   // Block/plot letters such as A-12 or B 5 read as letter names, not a vowel.
   const choices=letters&&t.word.length===1?[letterNames[t.word.toLowerCase()]]:await getHindiChoices(t.word);
   if(state().language!=='hi'||!commit&&(r!==rev||input.value!==expected))return;
   if(commit){if(!replaceAll(t,choices[0]))return;if(input.value===expected.slice(0,t.start)+choices[0]+expected.slice(t.end))show({value:input.value,start:t.start,end:t.start+choices[0].length},choices);status.textContent='गलत spelling हो तो नीचे दूसरा सुझाव चुनें।'}
   else{show(t,choices);status.textContent='Space से पहला सुझाव; या नीचे सही शब्द चुनें।'}
  }catch(err){
   if(state().language!=='hi'||!commit&&r!==rev)return;
   if(!commit||r===rev)hide();
   if(fallback&&commit){replaceAll(t,fallback(t.word));status.textContent=offline}
   else status.textContent=offline;
  }
 }
 input.addEventListener('input',()=>{
  clearTimeout(timer);++rev;hide();
  if(state().language!=='hi'){status.textContent='English mode: English में ही रहेगा।';return}
  const t=token();if(!t)return;timer=setTimeout(()=>suggest(t),300);
 });
 input.addEventListener('beforeinput',e=>{
  if(e.isComposing||state().language!=='hi'||e.inputType!=='insertText'||!e.data||!sep.test(e.data))return;
  const t=token();if(!t)return;
  // Let the keyboard insert the separator before committing the captured word.
  setTimeout(()=>{clearTimeout(timer);if(input.value.startsWith(t.value.slice(0,t.end)+e.data))suggest(t,true,input.value)},0);
 });
 input.addEventListener('blur',()=>{clearTimeout(timer);const t=token();if(t&&state().language==='hi')suggest(t,true)});
 input.addEventListener('keydown',e=>{
  if(e.isComposing||!cur||state().language!=='hi')return;
  if(e.key==='Escape'){hide();return}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();active=(active+(e.key==='ArrowDown'?1:-1)+cur.choices.length)%cur.choices.length;
   [...box.children].forEach((b,i)=>b.style.background=i===active?'#f5dfe5':'#fff');
  }else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();choose(active)}
 });
 return f;
}
hindiField({input:$('#guest-name'),box:$('#name-suggestions'),status:$('#typing-status'),re:/[A-Za-z]+(?:[ \t]+[A-Za-z]+)*$/,sep:/^[\s,.;!?]$/,
 idle:'नाम English में लिखें, Hindi में अपने-आप बदलेगा।',done:'नाम की spelling जाँच लें।',offline:'Hindi सुझाव नहीं मिले। Internet जाँचें या Hindi में नाम भरें। Roman spelling बदली नहीं गई।'});
for(const id of ['address1','address2'])hindiField({input:$('#'+id),box:$('#'+id+'-suggestions'),status:$('#address-status'),re:/[A-Za-z]+$/,sep:/^[\s,.;!?\/()\-:#]$/,
 idle:'पता English में लिखें; Space पर Hindi में बदलेगा।',done:'शब्द की spelling जाँच लें।',offline:'Internet नहीं मिला; सामान्य Hindi रूपांतरण लगाया। Spelling जाँच लें।',fallback:romanToHindi,letters:true});
const resetFields=()=>fields.forEach(f=>{f.reset();f.status.textContent=state().language==='hi'?f.idle:'English mode: English में ही रहेगा।'});
form.addEventListener('change',resetFields);
$('#next').addEventListener('click',()=>fields.forEach(f=>{f.reset();f.status.textContent=''}));

form.addEventListener('input',()=>{showError('');render()});
form.addEventListener('change',()=>{const en=state().language==='en';$('#family-help').textContent=en?'चुना होने पर ऊपर “(With family)” जुड़ेगा।':'चुना होने पर ऊपर “(सपरिवार)” जुड़ेगा।';$('#guest-name').placeholder=en?'e.g. Rajesh Sharma Ji':'जैसे: राजेश शर्मा जी';$('#address1').placeholder=en?'e.g. 24, Shastri Nagar':'जैसे: 24, शास्त्री नगर';$('#address2').placeholder=en?'e.g. Jaipur, Rajasthan':'जैसे: जयपुर, राजस्थान';render()});
$('#example').addEventListener('click',()=>{const en=state().language==='en';$('#guest-name').value=en?'Rajesh Sharma Ji':'राजेश शर्मा जी';$('#address1').value=en?'24, Shastri Nagar':'24, शास्त्री नगर';$('#address2').value=en?'Jaipur, Rajasthan':'जयपुर, राजस्थान';$('#family').checked=true;showError('');render()});
$('#next').addEventListener('click',()=>{if(busy)return;['guest-name','address1','address2'].forEach(id=>$('#'+id).value='');$('#family').checked=false;showError('');$('#status').textContent='अगले मेहमान का नाम भरें।';render();$('#guest-name').focus()});
function addLink(doc,page,rect,url){const L=PDFLib,ctx=doc.context;const a=ctx.obj({Type:'Annot',Subtype:'Link',Rect:rect,Border:[0,0,0],A:{Type:'Action',S:'URI',URI:L.PDFString.of(url)}});const ref=ctx.register(a);const k=L.PDFName.of('Annots');let arr=page.node.lookup(k);if(!arr){arr=ctx.obj([]);page.node.set(k,arr)}arr.push(ref)}
async function buildPdf(pngData){const doc=await PDFLib.PDFDocument.load(pdfBytes.slice());const png=await doc.embedPng(pngData);doc.getPage(0).drawImage(png,{x:0,y:0,width:W,height:H});addLink(doc,doc.getPage(0),[712,451,732,475],'https://developers.haritt.com/');return doc.save()}
function releasePdf(){if(prepared){URL.revokeObjectURL(prepared.url);URL.revokeObjectURL(prepared.downloadUrl)}prepared=null;$('#download').removeAttribute('href');$('#download').setAttribute('aria-disabled','true');$('#download').classList.add('disabled');$('#open-pdf').hidden=true;$('#save-pdf').hidden=true;$('#save-pdf').removeAttribute('href');}
function queuePdf(st){const key=JSON.stringify(st);if(key===lastKey)return;lastKey=key;const current=++revision;clearTimeout(prepareTimer);releasePdf();showError('');if(!st.name){$('#status').textContent='नाम भरकर शुरू करें।';return}$('#status').textContent='आपकी PDF तैयार हो रही है…';const pngData=overlay.toDataURL('image/png');prepareTimer=setTimeout(async()=>{try{const bytes=await buildPdf(pngData);if(current!==revision)return;const blob=new Blob([bytes],{type:'application/pdf'});prepared={bytes,blob,url:URL.createObjectURL(blob),downloadUrl:URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'})),filename:filename(st.name)};$('#download').href=prepared.downloadUrl;$('#download').download=prepared.filename;$('#download').setAttribute('aria-disabled','false');$('#download').classList.remove('disabled');$('#open-pdf').href=prepared.url;$('#open-pdf').hidden=false;$('#save-pdf').href=prepared.downloadUrl;$('#save-pdf').download=prepared.filename;$('#save-pdf').hidden=false;$('#status').textContent='PDF तैयार है · डाउनलोड करें';}catch(err){if(current!==revision)return;showError('PDF तैयार नहीं हो सकी। “फिर प्रयास करें” दबाएँ।');$('#status').textContent='';$('#retry-pdf').hidden=false;console.error(err)}},350)}
async function saveOnPc(pdf){try{const handle=await window.showSaveFilePicker({suggestedName:pdf.filename,types:[{description:'PDF invitation',accept:{'application/pdf':['.pdf']}}]});const writer=await handle.createWritable();await writer.write(pdf.blob);await writer.close();$('#status').textContent='PDF सेव हो गई।';showError('');}catch(err){if(err.name==='AbortError'){$('#status').textContent='डाउनलोड रद्द हुआ। दोबारा दबाएँ।';return}showError('');$('#save-pdf').hidden=false;$('#save-pdf').href=pdf.downloadUrl;$('#save-pdf').download=pdf.filename;$('#save-pdf').click();console.info('Save picker unavailable; using file download',err.name)}}
$('#download').addEventListener('click',e=>{if(!prepared){e.preventDefault();if(!state().name){showError('कृपया नाम भरें।');$('#guest-name').focus()}else $('#status').textContent='PDF तैयार हो रही है, एक पल रुकें।';return}if(typeof window.showSaveFilePicker==='function'){e.preventDefault();saveOnPc(prepared)}else{$('#status').textContent='डाउनलोड शुरू हो गया। Downloads folder में देखें।'}});
form.addEventListener('submit',e=>{e.preventDefault();$('#download').click()});
$('#retry-pdf').addEventListener('click',()=>{$('#retry-pdf').hidden=true;lastKey=null;render()});
$('#save-pdf').addEventListener('click',e=>{if(!prepared){e.preventDefault();return}$('#status').textContent='डाउनलोड शुरू हो गया। Downloads folder में देखें।'});
window.addEventListener('pagehide',()=>{if(prepared){URL.revokeObjectURL(prepared.url);URL.revokeObjectURL(prepared.downloadUrl)}});
$('#zoom').addEventListener('click',()=>{if(!ready)return;$('#large-preview').src=canvas.toDataURL('image/png');$('#full-preview').showModal()});$('#close-zoom').addEventListener('click',()=>$('#full-preview').close());
async function init(){try{await Promise.all([document.fonts.load('20px Kalam','सपरिवार राजेश शर्मा'),document.fonts.load('20px KalamLatin','Rajesh Sharma'),document.fonts.load('24px Caveat','Rajesh Sharma'),new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src='first-page.png'}),new Promise((resolve,reject)=>{mark.onload=resolve;mark.onerror=reject;mark.src='art/card-mark.png'}),fetch('invitation.pdf').then(r=>{if(!r.ok)throw new Error('Invitation unavailable');return r.arrayBuffer()}).then(b=>{pdfBytes=new Uint8Array(b);if(String.fromCharCode(...pdfBytes.slice(0,5))!=='%PDF-')throw new Error('Invalid invitation PDF')})]);if(!window.PDFLib)throw new Error('PDF engine unavailable');ready=true;$('#loading').hidden=true;$('#status').textContent='तैयार है · नाम भरकर शुरू करें';render()}catch(err){$('#loading').textContent='कार्ड लोड नहीं हुआ। पेज refresh करें।';showError('Invitation लोड नहीं हो सका। कृपया पेज refresh करें।');console.error(err)}}
init();
})();
