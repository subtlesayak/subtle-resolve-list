const endpoint = 'https://countapi.mileshilliard.com/api/v1';
const key = 'subtlesayak-subtle-resolve-list-visits-20260908';
export function counterUrl(location) {
 if(location.protocol!=='https:' || location.hostname!=='subtlesayak.github.io' || !location.pathname.startsWith('/open-resolve-list/')) return null;
 return endpoint+'/hit/'+key;
}
export function parseCount(data) {
 const raw=data?.value;
 if(!['string','number'].includes(typeof raw) || !/^\d+$/.test(String(raw)))throw Error('Invalid count');
 const count=Number(raw);
 if(!Number.isSafeInteger(count))throw Error('Invalid count');
 return count;
}
export async function loadCount(url, request=fetch) {
 const read=async target=>{const response=await request(target,{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Counter request failed');return parseCount(await response.json());};
 try{return await read(url);}catch{return read(url.replace('/hit/','/get/'));}
}
if(typeof document!=='undefined') {
 const container=document.getElementById('visit-counter'),url=counterUrl(window.location);
 if(container&&url) {
  const storageKey='resolve-visit-count';
  container.textContent='Visits: loading…';
  loadCount(url).then(count=>{
   container.textContent='Visits: '+count.toLocaleString();
   container.title='Approximate page views since September 8, 2026; not unique visitors';
   try{localStorage.setItem(storageKey,String(count));}catch{}
  }).catch(()=>{
   try{const saved=localStorage.getItem(storageKey);if(saved!==null){container.textContent='Visits: '+parseCount({value:saved}).toLocaleString()+' (last recorded)';return;}}catch{}
   container.hidden=true;
  });
 }
}
