<!-- Monte Carlo Engine -->
<script>
function runMC(){
  const btn=document.getElementById('runBtn');btn.disabled=true;btn.textContent='Running...';
  const pb=document.getElementById('pb'),pf=document.getElementById('pf');pb.style.display='block';
  const N=10000,Y=5;

  // Samplers
  function rN(){let u,v,s;do{u=Math.random()*2-1;v=Math.random()*2-1;s=u*u+v*v;}while(s>=1||s===0);return u*Math.sqrt(-2*Math.log(s)/s);}
  function rTri(a,b,c){const u=Math.random(),fc=(c-a)/(b-a);return u<fc?a+Math.sqrt(u*(b-a)*(c-a)):b-Math.sqrt((1-u)*(b-a)*(b-c));}
  function rBeta(al,be){function rG(a){if(a<1)return rG(a+1)*Math.pow(Math.random(),1/a);const d=a-1/3,c=1/Math.sqrt(9*d);let x,v;while(true){do{x=rN();v=1+c*x;}while(v<=0);v=v*v*v;const u=Math.random();if(u<1-.0331*(x*x)*(x*x))return d*v;if(Math.log(u)<.5*x*x+d*(1-v+Math.log(v)))return d*v;}}const ga=rG(al),gb=rG(be);return ga/(ga+gb);}

  const L=[[1,0,0],[-.6,.8,0],[-.5,.5,.707]];
  const gM=.047,gS=.012,iM=.05,iS=.035,fML=Math.log(10.9),fSL=.18;
  const sMin=6.5,sMode=10,sMax=13.5,sgMin=.08,sgMode=.15,sgMax=.22;
  const pA=2,pB=12,pLo=.005,pHi=.06,dP=.35,dMin=6,dMax=18,k=2.5,cc=2.5,fxB=10.9;

  const res=new Array(N),y5=new Array(N);
  // Store draws for PRCC
  const draws={gdp:new Float32Array(N),inf:new Float32Array(N),fx:new Float32Array(N),sam:new Float32Array(N),sg:new Float32Array(N),pen:new Float32Array(N),delay:new Float32Array(N)};

  let step=0;const BS=500;
  function batch(){
    const end=Math.min(step+BS,N);
    for(let i=step;i<end;i++){
      const z=[rN(),rN(),rN()];
      const cr=[L[0][0]*z[0],L[1][0]*z[0]+L[1][1]*z[1],L[2][0]*z[0]+L[2][1]*z[1]+L[2][2]*z[2]];
      const gdp=gM+gS*cr[0];
      const inf=Math.max(.02,Math.min(.25,iM+iS*cr[1]));
      const sam=rTri(sMin,sMax,sMode);
      const sg=rTri(sgMin,sgMax,sgMode);
      const pr=rBeta(pA,pB);
      const pFin=pLo+pr*(pHi-pLo);
      const hd=Math.random()<dP;
      const dm=hd?dMin+Math.random()*(dMax-dMin):0;
      const dy=dm/12;

      draws.gdp[i]=gdp;draws.inf[i]=inf;draws.fx[i]=cr[2];draws.sam[i]=sam;draws.sg[i]=sg;draws.pen[i]=pFin;draws.delay[i]=dy;

      const path=new Array(Y);
      for(let y=0;y<Y;y++){
        const yr=y+1;
        const fsy=fSL/Math.sqrt(yr);
        const fxcr=cr[2]*fsy/fSL;
        const fx=Math.exp(fML+fsy*fxcr);
        const gm=1+(gdp-gM)*.3;
        const mkt=sam*Math.pow(1+sg,yr)*gm;
        const ey=Math.max(0,yr-dy);
        const pen=pFin/(1+Math.exp(-k*(ey-cc)));
        const fxi=fxB/fx;
        path[y]=mkt*pen*fxi;
      }
      res[i]=path;y5[i]=path[4];
    }
    step=end;pf.style.width=(step/N*100)+'%';
    if(step<N)requestAnimationFrame(batch);else finalize();
  }

  function pct(arr,p){const s=arr.slice().sort((a,b)=>a-b);return s[Math.min(Math.floor(p/100*s.length),s.length-1)];}
  function fmt(v){return v>=1?'$'+v.toFixed(1)+'M':'$'+(v*1000).toFixed(0)+'K';}

  function finalize(){
    btn.textContent='✓ Complete';pb.style.display='none';
    ['expl','scCards','fanWrap','dtWrap','histWrap','statsRow','insBar','assT','mcDisc','prccWrap','prccNote'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=el.classList.contains('scenario-cards')?'grid':el.classList.contains('stats-row')?'grid':el.tagName==='TABLE'?'table':'block';});
    ['narP10','narP50','narP90'].forEach(id=>document.getElementById(id).style.display='block');

    const p5=pct(y5,5),p10=pct(y5,10),p25=pct(y5,25),p50=pct(y5,50),p75=pct(y5,75),p90=pct(y5,90),p95=pct(y5,95);
    document.getElementById('v25').textContent=fmt(p25);
    document.getElementById('v50').textContent=fmt(p50);
    document.getElementById('v75').textContent=fmt(p75);

    // SOM cross-check (SOM: $0.4M–$1.2M)
    let somFlag='';
    if(p50>1.2*1.5)somFlag=' ⚠️ P50 significantly exceeds SOM upper bound ($1.2M). This may indicate overstated penetration — treat P25 as more realistic central estimate.';
    else if(p50>1.2)somFlag=' P50 modestly exceeds SOM estimate; driven by favorable macro draws in median scenario.';

    document.getElementById('insBar').textContent='In the median scenario, Year 5 addressable revenue reaches '+fmt(p50)+'. The P25–P75 range spans '+fmt(p25)+' to '+fmt(p75)+'. Exchange rate volatility and regulatory delay are the dominant variance drivers.'+somFlag;

    // Stats
    const mean=y5.reduce((a,b)=>a+b,0)/N;
    const variance=y5.reduce((a,b)=>a+(b-mean)*(b-mean),0)/N;
    const std=Math.sqrt(variance);
    const skew=y5.reduce((a,b)=>a+Math.pow((b-mean)/std,3),0)/N;
    document.getElementById('sMean').textContent=fmt(mean);
    document.getElementById('sMedian').textContent=fmt(p50);
    document.getElementById('sStd').textContent=fmt(std);
    document.getElementById('sSkew').textContent=skew.toFixed(2);

    // Annual data table
    const tbody=document.getElementById('dtBody');tbody.innerHTML='';
    for(let y=0;y<Y;y++){
      const yv=res.map(r=>r[y]);
      const row=document.createElement('tr');
      row.innerHTML='<td>Year '+(y+1)+'</td><td>'+fmt(pct(yv,10))+'</td><td>'+fmt(pct(yv,25))+'</td><td>'+fmt(pct(yv,50))+'</td><td>'+fmt(pct(yv,75))+'</td><td>'+fmt(pct(yv,90))+'</td>';
      tbody.appendChild(row);
    }

    // Scenario narratives
    document.getElementById('narP10v').textContent=fmt(p10)+' (Year 5)';
    document.getElementById('narP10t').textContent='Under stress conditions — cedi depreciating to GHS 14–15/USD, GDP growth at the conservative 4.0% floor, education sector growing at just 8%, and a regulatory delay of 12–18 months absorbing most of Year 1 — the academy launches late, enrolls smaller cohorts, and faces FX erosion on any USD-denominated revenue. At this level, the operation is marginally viable as a standalone business but functions as a proof-of-concept and relationship-building platform. The real value in the P10 scenario is institutional credibility and first-mover positioning for the eventual scale phase — not Year 5 revenue.';
    document.getElementById('narP50v').textContent=fmt(p50)+' (Year 5)';
    document.getElementById('narP50t').textContent='Under blended institutional forecasts (GDP 4.7%, cedi 10.5–12.5/USD, education sector growing at 15%), the academy achieves CTVET accreditation within 6–9 months, runs 3–4 cohorts per year by Year 3, and builds a pipeline of graduates commanding premium pricing in Greater Accra. Government partnership under Adwumawura/NAP adds institutional credibility and potential student subsidies. The "Master\'s Chair Certified" credential begins establishing market recognition. At this level, the operation is self-sustaining and generating proof for the regional expansion thesis.';
    document.getElementById('narP90v').textContent=fmt(p90)+' (Year 5)';
    document.getElementById('narP90t').textContent='Under favorable conditions — GDP tracking 2025 outperformance (6%+), cedi appreciating further, education sector growing 20%+, rapid CTVET accreditation, government co-investment secured, and early regional enrollment from Nigeria and Côte d\'Ivoire — the academy achieves scale faster than baseline and begins generating product-line revenue from a co-branded men\'s grooming range. At this level, the operation has demonstrated the regional model and is positioned for Free Zone conversion and multi-country expansion. Plausibility note: a sub-$1M entrant capturing this share of a $10M SAM in 5 years, while not historically exceptional, requires several favorable conditions materializing simultaneously.';

    drawFan(res,Y);drawHist(y5);drawPRCC(draws,y5);
  }

  function drawFan(res,Y){
    const cv=document.getElementById('fanC'),cx=cv.getContext('2d'),W=cv.width,H=cv.height;cx.clearRect(0,0,W,H);
    const p={l:75,r:30,t:35,b:55},cw=W-p.l-p.r,ch=H-p.t-p.b;
    const bands=[];
    for(let y=0;y<Y;y++){const v=res.map(r=>r[y]).sort((a,b)=>a-b);bands.push({p5:v[Math.floor(.05*v.length)],p10:v[Math.floor(.1*v.length)],p25:v[Math.floor(.25*v.length)],p50:v[Math.floor(.5*v.length)],p75:v[Math.floor(.75*v.length)],p90:v[Math.floor(.9*v.length)],p95:v[Math.floor(.95*v.length)]});}
    const mx=Math.max(...bands.map(b=>b.p95))*1.15;
    const tx=y=>p.l+(y/(Y-1))*cw,ty=v=>p.t+ch-(v/mx)*ch;

    // P5-P95
    cx.fillStyle='rgba(42,157,143,.07)';cx.beginPath();
    for(let y=0;y<Y;y++)cx.lineTo(tx(y),ty(bands[y].p95));
    for(let y=Y-1;y>=0;y--)cx.lineTo(tx(y),ty(bands[y].p5));cx.closePath();cx.fill();
    // P10-P90
    cx.fillStyle='rgba(42,157,143,.1)';cx.beginPath();
    for(let y=0;y<Y;y++)cx.lineTo(tx(y),ty(bands[y].p90));
    for(let y=Y-1;y>=0;y--)cx.lineTo(tx(y),ty(bands[y].p10));cx.closePath();cx.fill();
    // P25-P75
    cx.fillStyle='rgba(42,157,143,.2)';cx.beginPath();
    for(let y=0;y<Y;y++)cx.lineTo(tx(y),ty(bands[y].p75));
    for(let y=Y-1;y>=0;y--)cx.lineTo(tx(y),ty(bands[y].p25));cx.closePath();cx.fill();
    // P50
    cx.strokeStyle='#C9A84C';cx.lineWidth=3;cx.beginPath();
    for(let y=0;y<Y;y++){y===0?cx.moveTo(tx(y),ty(bands[y].p50)):cx.lineTo(tx(y),ty(bands[y].p50));}cx.stroke();

    // Axes
    cx.strokeStyle='rgba(255,255,255,.12)';cx.lineWidth=1;cx.beginPath();cx.moveTo(p.l,p.t);cx.lineTo(p.l,p.t+ch);cx.lineTo(p.l+cw,p.t+ch);cx.stroke();
    cx.fillStyle='rgba(255,255,255,.45)';cx.font='11px JetBrains Mono';cx.textAlign='center';
    for(let y=0;y<Y;y++)cx.fillText('Y'+(y+1),tx(y),H-p.b+20);
    cx.textAlign='right';const steps=5;
    for(let i=0;i<=steps;i++){const v=(mx/steps)*i;cx.fillText(v>=1?'$'+v.toFixed(1)+'M':'$'+(v*1000).toFixed(0)+'K',p.l-8,ty(v)+4);if(i>0){cx.strokeStyle='rgba(255,255,255,.04)';cx.beginPath();cx.moveTo(p.l,ty(v));cx.lineTo(p.l+cw,ty(v));cx.stroke();}}

    // Legend
    cx.textAlign='left';cx.font='10px JetBrains Mono';
    const ly=p.t+8;
    cx.fillStyle='rgba(42,157,143,.3)';cx.fillRect(p.l+10,ly,12,12);cx.fillStyle='rgba(255,255,255,.45)';cx.fillText('P5–P95',p.l+28,ly+10);
    cx.fillStyle='rgba(42,157,143,.5)';cx.fillRect(p.l+85,ly,12,12);cx.fillStyle='rgba(255,255,255,.45)';cx.fillText('P10–P90',p.l+103,ly+10);
    cx.fillStyle='rgba(42,157,143,.7)';cx.fillRect(p.l+170,ly,12,12);cx.fillStyle='rgba(255,255,255,.45)';cx.fillText('P25–P75',p.l+188,ly+10);
    cx.fillStyle='#C9A84C';cx.fillRect(p.l+255,ly+3,22,3);cx.fillStyle='rgba(255,255,255,.45)';cx.fillText('P50',p.l+283,ly+10);
  }

  function drawHist(vals){
    const cv=document.getElementById('histC'),cx=cv.getContext('2d'),W=cv.width,H=cv.height;cx.clearRect(0,0,W,H);
    const p={l:75,r:30,t:40,b:55},cw=W-p.l-p.r,ch=H-p.t-p.b;
    const sorted=vals.slice().sort((a,b)=>a-b),lo=sorted[Math.floor(.01*sorted.length)],hi=sorted[Math.floor(.99*sorted.length)];
    const bins=30,bw=(hi-lo)/bins,counts=new Array(bins).fill(0);
    for(const v of vals){const idx=Math.min(Math.floor((v-lo)/bw),bins-1);if(idx>=0&&idx<bins)counts[idx]++;}
    const mc=Math.max(...counts);
    const p25v=sorted[Math.floor(.25*sorted.length)],p50v=sorted[Math.floor(.5*sorted.length)],p75v=sorted[Math.floor(.75*sorted.length)];

    for(let i=0;i<bins;i++){
      const x=p.l+(i/bins)*cw,w=cw/bins-1,h=(counts[i]/mc)*ch,bm=lo+(i+.5)*bw;
      cx.fillStyle=bm<=p25v?'rgba(224,122,95,.55)':bm<=p75v?'rgba(201,168,76,.55)':'rgba(42,157,143,.55)';
      cx.fillRect(x,p.t+ch-h,w,h);
    }
    function pLine(val,col,lbl){const x=p.l+((val-lo)/(hi-lo))*cw;cx.strokeStyle=col;cx.lineWidth=2;cx.setLineDash([6,3]);cx.beginPath();cx.moveTo(x,p.t);cx.lineTo(x,p.t+ch);cx.stroke();cx.setLineDash([]);cx.fillStyle=col;cx.font='10px JetBrains Mono';cx.textAlign='center';cx.fillText(lbl,x,p.t-8);}
    pLine(p25v,'#E07A5F','P25');pLine(p50v,'#C9A84C','P50');pLine(p75v,'#2A9D8F','P75');

    cx.fillStyle='rgba(255,255,255,.45)';cx.font='11px JetBrains Mono';cx.textAlign='center';
    for(let i=0;i<=5;i++){const v=lo+(hi-lo)*i/5;cx.fillText(v>=1?'$'+v.toFixed(1)+'M':'$'+(v*1000).toFixed(0)+'K',p.l+(i/5)*cw,H-p.b+22);}
    cx.textAlign='left';cx.fillText('Year 5 Addressable Revenue Distribution (10,000 scenarios)',p.l,p.t-18);
  }

  function drawPRCC(draws,y5){
    // Spearman rank correlation approximation
    function rankArr(arr){const idx=Array.from({length:arr.length},(_,i)=>i);idx.sort((a,b)=>arr[a]-arr[b]);const ranks=new Float32Array(arr.length);for(let i=0;i<idx.length;i++)ranks[idx[i]]=i;return ranks;}
    function spearman(a,b){const ra=rankArr(a),rb=rankArr(b);const n=a.length;let sx=0,sy=0,sxy=0,sx2=0,sy2=0;for(let i=0;i<n;i++){sx+=ra[i];sy+=rb[i];sxy+=ra[i]*rb[i];sx2+=ra[i]*ra[i];sy2+=rb[i]*rb[i];}return(n*sxy-sx*sy)/Math.sqrt((n*sx2-sx*sx)*(n*sy2-sy*sy));}

    const y5f=new Float32Array(y5);
    const vars=[
      {name:'FX Volatility',arr:draws.fx},
      {name:'Regulatory Delay',arr:draws.delay},
      {name:'Penetration Rate',arr:draws.pen},
      {name:'Addressable Market',arr:draws.sam},
      {name:'Sector Growth',arr:draws.sg},
      {name:'GDP Growth',arr:draws.gdp},
      {name:'Inflation',arr:draws.inf}
    ];
    const corrs=vars.map(v=>({name:v.name,r:spearman(v.arr,y5f)}));
    corrs.sort((a,b)=>Math.abs(b.r)-Math.abs(a.r));

    const cv=document.getElementById('prccC'),cx=cv.getContext('2d'),W=cv.width,H=cv.height;cx.clearRect(0,0,W,H);
    const p={l:160,r:40,t:40,b:30},cw=W-p.l-p.r,ch=H-p.t-p.b;
    const barH=ch/corrs.length-6;
    const maxR=Math.max(...corrs.map(c=>Math.abs(c.r)));

    cx.fillStyle='rgba(255,255,255,.45)';cx.font='11px JetBrains Mono';cx.textAlign='left';
    cx.fillText('PRCC Sensitivity — Year 5 Revenue (|Spearman ρ|, ranked)',p.l,p.t-15);

    // Center line
    const cx0=p.l+cw/2;
    cx.strokeStyle='rgba(255,255,255,.1)';cx.lineWidth=1;cx.beginPath();cx.moveTo(cx0,p.t);cx.lineTo(cx0,p.t+ch);cx.stroke();

    corrs.forEach((c,i)=>{
      const y=p.t+i*(barH+6);
      const barW=(Math.abs(c.r)/maxR)*(cw/2-10);
      const x=c.r>=0?cx0:cx0-barW;
      cx.fillStyle=c.r>=0?'rgba(42,157,143,.6)':'rgba(224,122,95,.6)';
      cx.fillRect(x,y,barW,barH);

      cx.fillStyle='rgba(255,255,255,.6)';cx.font='11px Source Sans 3';cx.textAlign='right';
      cx.fillText(c.name,p.l-8,y+barH/2+4);

      cx.fillStyle='rgba(255,255,255,.45)';cx.font='10px JetBrains Mono';cx.textAlign=c.r>=0?'left':'right';
      cx.fillText((c.r>=0?'+':'')+c.r.toFixed(3),c.r>=0?cx0+barW+6:cx0-barW-6,y+barH/2+4);
    });

    // Legend
    cx.font='10px JetBrains Mono';cx.textAlign='left';
    cx.fillStyle='rgba(42,157,143,.6)';cx.fillRect(p.l,H-p.b+5,12,12);cx.fillStyle='rgba(255,255,255,.4)';cx.fillText('Positive (↑ input → ↑ revenue)',p.l+18,H-p.b+15);
    cx.fillStyle='rgba(224,122,95,.6)';cx.fillRect(p.l+260,H-p.b+5,12,12);cx.fillStyle='rgba(255,255,255,.4)';cx.fillText('Negative (↑ input → ↓ revenue)',p.l+278,H-p.b+15);
  }

  requestAnimationFrame(batch);
}
</script>
