const indicator=document.querySelector('#updates-indicator');
if(indicator){
  fetch('catalogue.json?v=8',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
    const update=data?.latestUpdate;
    if(!update?.release)return;
    const count=Number(update.addedCount??update.added_urls?.length??0);
    indicator.textContent=count?`New ${update.release}`:update.release;
    indicator.hidden=false;
    indicator.title=count?`${count} new catalogue ${count===1?'resource':'resources'}`:`Latest catalogue update ${update.release}`;
  }).catch(()=>{});
}
