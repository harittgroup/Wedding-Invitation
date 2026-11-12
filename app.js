(()=>{'use strict';
const W=763,H=515,S=4,$=s=>document.querySelector(s),form=$('#guest-form'),canvas=$('#preview'),ctx=canvas.getContext('2d'),overlay=document.createElement('canvas');overlay.width=W*S;overlay.height=H*S;const oc=overlay.getContext('2d');
const image=new Image();let ready=false,busy=false,pdfBytes=null,lastMetrics=[];
let prepared=null,prepareTimer=null,revision=0,lastKey=null;
const clean=v=>v.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
const state=()=>({name:clean($('#guest-name').value),address1:clean($('#address1').value),address2:clean($('#address2').value),family:$('#family').checked,language:$('input[name=language]:checked').value,ink:$('input[name=ink]:checked').value,glitter:$('#glitter').checked});
function filename(name){return 'Wedding_Invitation_'+(name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').replace(/\s+/g,'_').replace(/[. ]+$/g,'').slice(0,100)||'Guest')+'.pdf'}
function fontFor(text){return /[\u0900-\u097f]/.test(text)?'Kalam, KalamLatin':'Caveat, KalamLatin'}
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
function write(text,x,baseline,width,size,st,kind){if(!text)return;
 const layer=document.createElement('canvas');layer.width=W*S;layer.height=H*S;const lc=layer.getContext('2d');lc.scale(S,S);lc.textBaseline='alphabetic';let metrics;
 // Fit visible ink bounds, including Devanagari vowel marks, within each ruled line.
 for(let n=0;n<4;n++){lc.font=`${size}px ${fontFor(text)}`;metrics=lc.measureText(text);const extent=Math.max(metrics.width,metrics.actualBoundingBoxRight+Math.max(0,metrics.actualBoundingBoxLeft));if(extent<=width)break;size*=width/extent*.985;}
 lc.font=`${size}px ${fontFor(text)}`;metrics=lc.measureText(text);const inkWidth=Math.max(metrics.width,metrics.actualBoundingBoxRight+Math.max(0,metrics.actualBoundingBoxLeft));const rule={name:266.5,address1:303.5,address2:339.5}[kind];if(rule)baseline=Math.min(baseline,rule-3-metrics.actualBoundingBoxDescent);const top=baseline-metrics.actualBoundingBoxAscent,bottom=baseline+metrics.actualBoundingBoxDescent;
 const base=st.ink==='red'?'#981c26':'#4c1522';lc.fillStyle=base;lc.fillText(text,x+Math.max(0,metrics.actualBoundingBoxLeft),baseline);
 if(st.glitter){lc.globalCompositeOperation='source-atop';const g=lc.createLinearGradient(0,top,0,bottom);g.addColorStop(0,st.ink==='red'?'#b93136':'#6b2231');g.addColorStop(.40,base);g.addColorStop(.48,st.ink==='red'?'#c55b48':'#8d4043');g.addColorStop(.56,base);g.addColorStop(1,st.ink==='red'?'#ae2629':'#591b2c');lc.fillStyle=g;lc.fillRect(x-1,top-1,width+3,bottom-top+3);
 const rnd=random(1739+Math.round(x*baseline));for(let i=0;i<width*(bottom-top)*1.2;i++){const px=x+rnd()*width,py=top+rnd()*(bottom-top);lc.fillStyle=i%12===0?'#fff0be':i%3===0?'#c99665':'#f3c49b';lc.globalAlpha=i%12===0?.86:.40;const r=i%12===0?.48:.24;lc.fillRect(px,py,r,r);}lc.globalAlpha=1;lc.globalCompositeOperation='source-over';}
 oc.drawImage(layer,0,0);lastMetrics.push({kind,text,size,x,top,bottom,right:x+inkWidth,maxRight:x+width});
}
function render(){if(!ready)return;const st=state();lastMetrics=[];oc.clearRect(0,0,overlay.width,overlay.height);
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
 const consonants={rsh:'र्ष',ksh:'क्ष',chh:'छ',kh:'ख',gh:'घ',ch:'च',jh:'झ',th:'थ',dh:'ध',ph:'फ',bh:'भ',sh:'श',ng:'ङ',ny:'ञ',k:'क',g:'ग',c:'क',j:'ज',t:'त',d:'द',n:'न',p:'प',b:'ब',m:'म',y:'य',r:'र',l:'ल',v:'व',w:'व',s:'स',h:'ह',f:'फ़',z:'ज़',q:'क़',x:'क्स'};
 const src=word.toLowerCase();let out='',pending=false;
 for(let i=0;i<src.length;){
  let token='';for(const n of [3,2,1]){const part=src.slice(i,i+n);if(vowels[part]||consonants[part]){token=part;break}}
  if(!token){out+=src[i++];pending=false;continue}
  if(vowels[token]){out+=vowels[token][pending?1:0];pending=false}
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
for(const id of ['guest-name','address1','address2']){
 const input=$('#'+id);
 // beforeinput supports both desktop Space and mobile soft keyboards.
 input.addEventListener('beforeinput',event=>{
  if(event.isComposing||state().language!=='hi'||event.inputType!=='insertText'||!event.data||!/^[\s,.;!?]$/.test(event.data))return;
  if(!event.cancelable)return;
  if(convertBeforeCaret(input)){
   event.preventDefault();input.setRangeText(event.data,input.selectionStart,input.selectionEnd,'end');
   input.dispatchEvent(new Event('input',{bubbles:true}));
  }
 });
 input.addEventListener('blur',()=>{if(convertBeforeCaret(input))input.dispatchEvent(new Event('input',{bubbles:true}))});

}

form.addEventListener('input',()=>{showError('');render()});
form.addEventListener('change',()=>{const en=state().language==='en';$('#family-help').textContent=en?'चुना होने पर ऊपर “(With family)” जुड़ेगा।':'चुना होने पर ऊपर “(सपरिवार)” जुड़ेगा।';$('#guest-name').placeholder=en?'e.g. Rajesh Sharma Ji':'जैसे: राजेश शर्मा जी';$('#address1').placeholder=en?'e.g. 24, Shastri Nagar':'जैसे: 24, शास्त्री नगर';$('#address2').placeholder=en?'e.g. Jaipur, Rajasthan':'जैसे: जयपुर, राजस्थान';render()});
$('#example').addEventListener('click',()=>{const en=state().language==='en';$('#guest-name').value=en?'Rajesh Sharma Ji':'राजेश शर्मा जी';$('#address1').value=en?'24, Shastri Nagar':'24, शास्त्री नगर';$('#address2').value=en?'Jaipur, Rajasthan':'जयपुर, राजस्थान';$('#family').checked=true;showError('');render()});
$('#next').addEventListener('click',()=>{if(busy)return;['guest-name','address1','address2'].forEach(id=>$('#'+id).value='');$('#family').checked=false;showError('');$('#status').textContent='अगले मेहमान का नाम भरें।';render();$('#guest-name').focus()});
async function buildPdf(pngData){const doc=await PDFLib.PDFDocument.load(pdfBytes.slice());const png=await doc.embedPng(pngData);doc.getPage(0).drawImage(png,{x:0,y:0,width:W,height:H});return doc.save()}
function releasePdf(){if(prepared){URL.revokeObjectURL(prepared.url);URL.revokeObjectURL(prepared.downloadUrl)}prepared=null;$('#download').removeAttribute('href');$('#download').setAttribute('aria-disabled','true');$('#download').classList.add('disabled');$('#open-pdf').hidden=true;$('#save-pdf').hidden=true;$('#save-pdf').removeAttribute('href');}
function queuePdf(st){const key=JSON.stringify(st);if(key===lastKey)return;lastKey=key;const current=++revision;clearTimeout(prepareTimer);releasePdf();showError('');if(!st.name){$('#status').textContent='नाम भरकर शुरू करें।';return}$('#status').textContent='आपकी PDF तैयार हो रही है…';const pngData=overlay.toDataURL('image/png');prepareTimer=setTimeout(async()=>{try{const bytes=await buildPdf(pngData);if(current!==revision)return;const blob=new Blob([bytes],{type:'application/pdf'});prepared={bytes,blob,url:URL.createObjectURL(blob),downloadUrl:URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'})),filename:filename(st.name)};$('#download').href=prepared.downloadUrl;$('#download').download=prepared.filename;$('#download').setAttribute('aria-disabled','false');$('#download').classList.remove('disabled');$('#open-pdf').href=prepared.url;$('#open-pdf').hidden=false;$('#save-pdf').href=prepared.downloadUrl;$('#save-pdf').download=prepared.filename;$('#save-pdf').hidden=false;$('#status').textContent='PDF तैयार है · Save बटन दबाकर folder चुनें';}catch(err){if(current!==revision)return;showError('PDF तैयार नहीं हो सकी। “फिर प्रयास करें” दबाएँ।');$('#status').textContent='';$('#retry-pdf').hidden=false;console.error(err)}},350)}
async function saveOnPc(pdf){try{const handle=await window.showSaveFilePicker({suggestedName:pdf.filename,types:[{description:'PDF invitation',accept:{'application/pdf':['.pdf']}}]});const writer=await handle.createWritable();await writer.write(pdf.blob);await writer.close();$('#status').textContent='PDF आपके चुने हुए folder में save हो गई।';showError('');}catch(err){if(err.name==='AbortError'){$('#status').textContent='Save रद्द किया गया। फिर क्लिक करके save कर सकते हैं।';return}showError('');$('#save-pdf').hidden=false;$('#save-pdf').href=pdf.downloadUrl;$('#save-pdf').download=pdf.filename;$('#save-pdf').click();console.info('Save picker unavailable; using file download',err.name)}}
$('#download').addEventListener('click',e=>{if(!prepared){e.preventDefault();if(!state().name){showError('कृपया नाम भरें।');$('#guest-name').focus()}else $('#status').textContent='PDF तैयार होने दें, फिर save करें।';return}if(typeof window.showSaveFilePicker==='function'){e.preventDefault();saveOnPc(prepared)}else{$('#status').textContent='Download शुरू हो रहा है। अपने browser के Downloads देखें।'}});
form.addEventListener('submit',e=>{e.preventDefault();$('#download').click()});
$('#retry-pdf').addEventListener('click',()=>{$('#retry-pdf').hidden=true;lastKey=null;render()});
$('#save-pdf').addEventListener('click',e=>{if(!prepared){e.preventDefault();return}$('#status').textContent='सीधा download शुरू हो रहा है। Browser के Downloads देखें।'});
window.addEventListener('pagehide',()=>{if(prepared){URL.revokeObjectURL(prepared.url);URL.revokeObjectURL(prepared.downloadUrl)}});
$('#zoom').addEventListener('click',()=>{if(!ready)return;$('#large-preview').src=canvas.toDataURL('image/png');$('#full-preview').showModal()});$('#close-zoom').addEventListener('click',()=>$('#full-preview').close());
async function init(){try{await Promise.all([document.fonts.load('20px Kalam','सपरिवार राजेश शर्मा'),document.fonts.load('20px KalamLatin','Rajesh Sharma'),document.fonts.load('24px Caveat','Rajesh Sharma'),new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src='first-page.png'}),fetch('invitation.pdf').then(r=>{if(!r.ok)throw new Error('Invitation unavailable');return r.arrayBuffer()}).then(b=>{pdfBytes=new Uint8Array(b);if(String.fromCharCode(...pdfBytes.slice(0,5))!=='%PDF-')throw new Error('Invalid invitation PDF')})]);if(!window.PDFLib)throw new Error('PDF engine unavailable');ready=true;$('#loading').hidden=true;$('#status').textContent='तैयार है · नाम भरकर शुरू करें';render()}catch(err){$('#loading').textContent='कार्ड लोड नहीं हुआ। पेज refresh करें।';showError('Invitation लोड नहीं हो सका। कृपया पेज refresh करें।');console.error(err)}}
init();
})();
