
const API_URL="https://pnq99qlmi1.execute-api.ap-south-1.amazonaws.com/twin";
let currentMode="live";
let liveHistory=JSON.parse(localStorage.getItem("twinHistory")||"[]");
let liveRequestId=0;

const demoScenarios={
    high:{application:"CloudOptimizationDemo",cpu_utilization:82,workload:100,response_time_ms:250,instances:2,recommended_instances:3,status:"UNDER-PROVISIONED",decision:"SCALE_OUT",timestamp:"High Load Demo"},
    normal:{application:"CloudOptimizationDemo",cpu_utilization:50,workload:60,response_time_ms:120,instances:3,recommended_instances:3,status:"OPTIMAL",decision:"MAINTAIN",timestamp:"Normal Load Demo"},
    low:{application:"CloudOptimizationDemo",cpu_utilization:20,workload:20,response_time_ms:100,instances:4,recommended_instances:3,status:"OVER-PROVISIONED",decision:"SCALE_IN",timestamp:"Low Load Demo"}
};

async function loadTwin(){
    if(currentMode!=="live")return;
    const requestId=++liveRequestId;
    try{
        const response=await fetch(API_URL);
        if(!response.ok)throw new Error("API request failed");
        const data=await response.json();
        if(currentMode!=="live"||requestId!==liveRequestId)return;
        updateDashboard(data);
        updateHistory(data);
    }catch(error){
        if(currentMode==="live"){
            console.error(error);
            document.getElementById("status").textContent="API ERROR";
            document.getElementById("statusDescription").textContent="Unable to retrieve the latest Digital Twin telemetry.";
        }
    }
}

function selectMode(mode){
    currentMode=mode;
    liveRequestId++;
    const banner=document.getElementById("demoBanner");
    const sourceLabel=document.getElementById("sourceLabel");
    const liveDot=document.getElementById("liveDot");
    if(mode==="live"){
        banner.hidden=true;
        sourceLabel.textContent="LIVE AWS TELEMETRY";
        liveDot.style.background="#7d9460";
        loadTwin();
        return;
    }
    banner.hidden=false;
    sourceLabel.textContent="DEMO DATA — NOT LIVE";
    liveDot.style.background="#a88452";
    updateDashboard(demoScenarios[mode]);
    document.getElementById("lastUpdated").textContent="DEMO";
    document.getElementById("history").innerHTML="<tr><td colspan=\"6\">Live history is unchanged and hidden in demonstration mode.</td></tr>";
    document.getElementById("historySummary").innerHTML="<div class=\"history-item\">Controlled scenario <strong>"+mode.toUpperCase()+"</strong></div>";
    document.getElementById("chartEmpty").style.display="none";
    renderDemoChart(demoScenarios[mode]);
}

function updateDashboard(data){
    const cpu=Number(data.cpu_utilization);
    const workload=Number(data.workload);
    const response=Number(data.response_time_ms);
    const instances=Number(data.instances??data.instance_count);
    const recommended=Number(data.recommended_instances);
    const decision=data.decision;
    const status=data.status;

    document.getElementById("cpu").textContent=`${cpu}%`;
    document.getElementById("workload").textContent=`${workload} req/s`;
    document.getElementById("response").textContent=`${response} ms`;
    document.getElementById("instances").textContent=instances;
    document.getElementById("recommendedTop").textContent=recommended;
    document.getElementById("status").textContent=status;
    document.getElementById("currentCapacity").textContent=instances;
    document.getElementById("recommendedCapacity").textContent=recommended;
    document.getElementById("capacityCurrentText").textContent=instances;
    document.getElementById("capacityRecommendedText").textContent=recommended;
    document.getElementById("decisionCurrent").textContent=instances;
    document.getElementById("decisionRecommended").textContent=recommended;
    document.getElementById("lastUpdated").textContent=currentMode==="live"?formatTime(data.timestamp):"DEMO";

    updateMetricLabels(cpu,response);
    updateStatus(status,decision);
    updateCapacity(instances,recommended);
    updateDecision(decision,cpu,response);
}

function updateMetricLabels(cpu,response){
    let cpuLabel=cpu>70?"High":cpu<30?"Low":"Healthy";
    let responseLabel=response>200?"High":response<100?"Low":"Healthy";
    document.getElementById("cpuLabel").textContent=cpuLabel;
    document.getElementById("responseLabel").textContent=responseLabel;
    const bar=document.getElementById("cpuBar");
    bar.style.width=`${Math.min(Math.max(cpu,0),100)}%`;
    bar.style.background=cpu>70?"#a88452":cpu<30?"#8d9272":"#7d9460";
}

function updateStatus(status,decision){
    const dot=document.getElementById("statusDot");
    const badge=document.getElementById("decisionBadge");
    const decisionStatus=document.getElementById("decisionStatus");
    const description=document.getElementById("statusDescription");
    if(status==="UNDER-PROVISIONED"){
        dot.style.background="#a88452";
        dot.style.boxShadow="0 0 0 5px rgba(168,132,82,.12)";
        badge.textContent="↑ SCALE OUT";
        description.textContent="High resource utilization or response time detected. Additional capacity is recommended.";
    }else if(status==="OVER-PROVISIONED"){
        dot.style.background="#8d9272";
        dot.style.boxShadow="0 0 0 5px rgba(141,146,114,.12)";
        badge.textContent="↓ SCALE IN";
        description.textContent="Current capacity exceeds the estimated requirement under the current workload.";
    }else{
        dot.style.background="#7d9460";
        dot.style.boxShadow="0 0 0 5px rgba(125,148,96,.12)";
        badge.textContent="✓ MAINTAIN";
        description.textContent="CPU utilization and response time are within the optimal operating range.";
    }
    decisionStatus.textContent=decision.replace("_"," ");
}

function updateCapacity(instances,recommended){
    const max=Math.max(instances,recommended,1);
    document.getElementById("currentBar").style.width=`${Math.max(instances/max*100,8)}%`;
    document.getElementById("recommendedBar").style.width=`${Math.max(recommended/max*100,8)}%`;
    const message=document.getElementById("capacityMessage");
    message.textContent=instances===recommended?"✓ Capacity balanced":recommended>instances?"↑ Additional capacity recommended":"↓ Excess capacity detected";
}

function updateDecision(decision,cpu,response){
    document.getElementById("decisionMain").textContent=decision.replace("_"," ");
    const explanation=document.getElementById("decisionExplanation");
    if(decision==="SCALE_OUT")
        explanation.textContent=`High CPU utilization (${cpu}%) or response time (${response} ms) indicates that additional capacity is required.`;
    else if(decision==="SCALE_IN")
        explanation.textContent=`Low CPU utilization (${cpu}%) and healthy response time (${response} ms) indicate excess capacity.`;
    else
        explanation.textContent=`CPU utilization (${cpu}%) and response time (${response} ms) are within the optimal operating range.`;
    document.getElementById("decisionStatus").textContent=decision.replace("_"," ");
}

function updateHistory(data){
    if(currentMode!=="live")return;
    const latest=liveHistory[0];
    if(!latest||latest.timestamp!==data.timestamp){
        liveHistory.unshift(data);
        liveHistory=liveHistory.slice(0,10);
        localStorage.setItem("twinHistory",JSON.stringify(liveHistory));
    }
    renderHistory(liveHistory);
    renderHistorySummary(liveHistory);
    updateChart();
}

function renderHistory(history){
    document.getElementById("history").innerHTML=history.map(item=>`
        <tr>
            <td><strong>${item.cpu_utilization}%</strong></td>
            <td>${item.workload} req/s</td>
            <td>${item.response_time_ms} ms</td>
            <td>${item.instances} → ${item.recommended_instances}</td>
            <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
            <td><span class="table-decision ${getDecisionClass(item.decision)}">${item.decision}</span></td>
        </tr>`).join("");
}

function renderHistorySummary(history){
    document.getElementById("historySummary").innerHTML=history.slice(0,3).map(item=>`
        <div class="history-item">
            <div><strong>${item.cpu_utilization}% CPU</strong><div>${item.instances} → ${item.recommended_instances} instances</div></div>
            <span class="history-decision ${getDecisionClass(item.decision)}">${item.decision}</span>
        </div>`).join("");
}

function updateChart(){
    const history=liveHistory.slice().reverse();
    const chartLines=document.getElementById("chartLines");
    const empty=document.getElementById("chartEmpty");
    if(history.length===0){
        empty.style.display="flex";
        chartLines.innerHTML="";
        return;
    }
    empty.style.display="none";
    const padding=8,height=100,width=100;
    const maxResponse=Math.max(...history.map(item=>Number(item.response_time_ms)),200);
    const points=(key,max)=>history.map((item,index)=>{
        const x=history.length===1?50:padding+index/(history.length-1)*(width-padding*2);
        const value=Math.min(Math.max(Number(item[key]),0),max);
        const y=height-padding-value/max*(height-padding*2);
        return `${x},${y}`;
    }).join(" ");
    chartLines.innerHTML=`<svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points="${points("cpu_utilization",100)}" fill="none" stroke="#8b6f47" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
        <polyline points="${points("response_time_ms",maxResponse)}" fill="none" stroke="#8d8273" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
    </svg>`;
}

function getStatusClass(status){
    return status==="UNDER-PROVISIONED"?"status-under":status==="OVER-PROVISIONED"?"status-over":"status-optimal";
}

function getDecisionClass(decision){
    return decision==="SCALE_OUT"?"decision-out":decision==="SCALE_IN"?"decision-in":"decision-maintain";
}

function formatTime(timestamp){
    if(!timestamp)return "--";
    const date=new Date(timestamp);
    return Number.isNaN(date.getTime())?timestamp:date.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

document.getElementById("demoMode").addEventListener("change",event=>selectMode(event.target.value));
loadTwin();
setInterval(()=>{if(currentMode==="live")loadTwin();},10000);


function renderDemoChart(data){
    const chartLines=document.getElementById("chartLines");
    const chartEmpty=document.getElementById("chartEmpty");

    chartEmpty.style.display="none";

    const cpu=Number(data.cpu_utilization);
    const response=Number(data.response_time_ms);

    const left=8;
    const right=92;
    const top=12;
    const bottom=88;

    const cpuY=bottom-(cpu/100)*(bottom-top);
    const responseY=bottom-(response/300)*(bottom-top);

    const scenarioNames={
        high:"HIGH LOAD SCENARIO — DEMO DATA",
        normal:"NORMAL LOAD SCENARIO — DEMO DATA",
        low:"LOW LOAD SCENARIO — DEMO DATA"
    };

    const mode=currentMode;
    const cpuPoints=`${left},${bottom} ${right},${cpuY}`;
    const responsePoints=`${left},${bottom} ${right},${responseY}`;

    chartLines.innerHTML=`
        <div style="position:absolute;top:8px;left:12px;z-index:2;font-size:11px;font-weight:700;letter-spacing:.5px;color:#8b6f47;">
            ${scenarioNames[mode]||"DEMO SCENARIO"}
        </div>
        <svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none"
             style="position:absolute;inset:0;width:100%;height:100%;">
            <line x1="${left}" y1="${top}" x2="${right}" y2="${top}"
                  stroke="#d8cdbd" stroke-dasharray="2 2"/>
            <line x1="${left}" y1="37.3" x2="${right}" y2="37.3"
                  stroke="#d8cdbd" stroke-dasharray="2 2"/>
            <line x1="${left}" y1="62.7" x2="${right}" y2="62.7"
                  stroke="#d8cdbd" stroke-dasharray="2 2"/>
            <line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}"
                  stroke="#d8cdbd" stroke-dasharray="2 2"/>

            <polyline points="${cpuPoints}" fill="none"
                      stroke="#8b6f47" stroke-width="1.5"
                      vector-effect="non-scaling-stroke"/>
            <circle cx="${right}" cy="${cpuY}" r="1.8" fill="#8b6f47"/>

            <polyline points="${responsePoints}" fill="none"
                      stroke="#8d8273" stroke-width="1.5"
                      vector-effect="non-scaling-stroke"/>
            <circle cx="${right}" cy="${responseY}" r="1.8" fill="#8d8273"/>
        </svg>
        <div style="position:absolute;right:12px;bottom:8px;z-index:2;background:#f3ede3;padding:5px 8px;border-radius:5px;font-size:11px;color:#746452;">
            CPU: ${cpu}% &nbsp;|&nbsp; Response: ${response} ms
        </div>
    `;
}