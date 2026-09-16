const make=(tag,text,cls)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
const link=(text,url)=>{const a=make('a',text);if(new URL(url).protocol==='https:')a.href=url;return a;};
const official = h => /(^|\.)blackmagicdesign\.com$/.test(new URL(h.url).hostname);
export function groupUpdates(releases,updates){return [...releases].sort((a,b)=>b.version.localeCompare(a.version,undefined,{numeric:true})).map(release=>({...release,updates:updates.filter(h=>h.release===release.version).sort((a,b)=>Number(official(b))-Number(official(a)))}));}
export function inlineTokens(text) {
 const tokens=[],pattern=/(\*\*([^*]+)\*\*|\[([^\]]+)\]\((https:\/\/[^)]+)\))/g;
 let end=0;
 for(const m of text.matchAll(pattern)) {
  if(m.index>end)tokens.push({type:'text',text:text.slice(end,m.index)});
  tokens.push(m[2]?{type:'strong',children:inlineTokens(m[2])}:{type:'link',url:m[4],children:inlineTokens(m[3])});
  end=m.index+m[0].length;
 }
 if(end<text.length)tokens.push({type:'text',text:text.slice(end)});
 return tokens;
}
function appendInline(parent,tokens) {
 for(const token of tokens) {
  if(token.type==='text'){parent.append(document.createTextNode(token.text));continue;}
  const el=token.type==='link'?link('',token.url):make('strong');
  appendInline(el,token.children);parent.append(el);
 }
}
export function creatorGroups(items, entries, urlFor = item => item.url) {
 const creators = new Map(entries.map(e => [e.url, e.creator]));
 const groups = new Map();
 for (const item of items) {
  const url = urlFor(item);
  const isOfficial = url && /(^|\.)blackmagicdesign\.com$/.test(new URL(url).hostname);
  const creator = isOfficial ? 'Blackmagic Design' : creators.get(url);
  // Unknown creators remain separate; a shared storefront is not a creator.
  const key = creator ? 'creator:' + creator : item;
  if (!groups.has(key)) groups.set(key, {creator, official: isOfficial, items: []});
  groups.get(key).items.push(item);
 }
 return [...groups.values()].sort((a,b) => Number(b.official)-Number(a.official));
}
export function releaseNoteBlocks(text) {
 const blocks=[];
 for(const line of text.split(/\r?\n/)) {
  if(!line.trim())continue;
  const heading=line.match(/^#{1,6} (.+)/),bullet=line.match(/^[-*] (.+)/);
  if(bullet) {
   if(blocks.at(-1)?.type!=='list')blocks.push({type:'list',items:[]});
   blocks.at(-1).items.push(bullet[1]);
  } else blocks.push({type:heading?'heading':'paragraph',text:heading?heading[1]:line,...(heading?{level:line.match(/^#+/)[0].length}:{})});
 }
 return blocks;
}
function releaseNotes(text, entries) {
 const root=make('div',undefined,'release-notes');let precedingHeading=null;
 for(const block of releaseNoteBlocks(text)) {
  if(block.type!=='list') {
   precedingHeading=block.type==='heading'?block.text:null;
   const el=make(block.type==='heading'?'h'+Math.max(3,block.level):'p');appendInline(el,inlineTokens(block.text));root.append(el);continue;
  }
  for(const group of creatorGroups(block.items,entries,line=>line.match(/\]\((https:\/\/[^)]+)\)/)?.[1])) {
   if(group.creator && group.items.length>1 && precedingHeading!==group.creator)root.append(make('h4',group.creator,'creator-heading'));
   const list=make('ul');
   for(const line of group.items){const li=make('li');appendInline(li,inlineTokens(line));list.append(li);}
   root.append(list);
  }
 }
 return root;
}
async function init(){const root=document.querySelector('#update-list');try{const response=await fetch('catalogue.json?v=8',{cache:'no-store'});if(!response.ok)throw Error(response.status);const data=await response.json();root.replaceChildren();root.removeAttribute('role');for(const release of groupUpdates(data.releases,data.updates)){const section=make('section',undefined,'catalogue-release');section.id=release.version;const heading=make('h2');heading.append(link(release.version,release.url));const title=release.title.replace(release.version,'').replace(/^\s*[—-]\s*/,'');const matches=data.entries.filter(e=>e.name.toLowerCase()===title.toLowerCase());const subtitle=make(matches.length===1?'h3':'p');subtitle.append(matches.length===1?link(title,matches[0].url):document.createTextNode(title));section.append(heading,subtitle,make('p','Published '+release.date.slice(0,10),'muted'));for(const group of creatorGroups(release.updates,data.entries)){const grouped=group.creator&&group.items.length>1;const parent=grouped?make('section',undefined,'creator-updates'):section;if(grouped){parent.append(make('h3',group.creator,'creator-heading'));section.append(parent);}for(const h of group.items){const article=make('article',undefined,'update');const itemHeading=make(grouped?'h4':'h3');itemHeading.append(link(h.name,h.url));article.append(itemHeading,make('p',h.from+' → '+h.to,'version'),make('p',h.summary));const details=make('details',undefined,'release-changelog');details.append(make('summary','Changelog · '+h.to));const list=make('ul');for(const change of h.changes||[h.summary])list.append(make('li',change));details.append(list);for(const source of h.changelogs||[{label:'Full source changelog',url:h.source}]){const p=make('p');p.append(link(source.label+' ↗',source.url));details.append(p);}article.append(details,make('p','Upstream date: '+(h.upstream_date?.slice(0,10)||'not established'),'muted'));parent.append(article);}}const notes=make('details',undefined,'release-changelog');notes.append(make('summary','Complete catalogue release notes'),releaseNotes(release.body,data.entries));section.append(notes,link('Read '+release.version+' on GitHub ↗',release.url));root.append(section);}}catch(error){root.replaceChildren(make('p','Release history could not load.'),link('Read releases on GitHub','https://github.com/subtlesayak/open-resolve-list/releases'));console.error(error);}}
if(typeof document!=='undefined')init();
