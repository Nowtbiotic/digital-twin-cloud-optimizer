const API_URL="https://pnq99qlmi1.execute-api.ap-south-1.amazonaws.com/twin";

async function loadTwin(){
    try{
        const response=await fetch(API_URL);
        if(!response.ok)
            throw new Error("API request failed");
        const data=await response.json();
        updateDashboard(data);
        updateHistory(data);
    }catch(error){
        console.error(error);
        document.getElementById("status").textContent="API ERROR";
        document.getElementById("statusDescription").textContent="Unable to retrieve the latest Digital Twin telemetry.";
    }
}

function updateDashboard(data){
    const cpu=Number(data.cpu_utilization);
    const workload=Number(data.workload);
    const response=Number(data.response_time_ms);
    const instances=Number(data.instances);
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
    document.getElementById("lastUpdated").textContent=formatTime(data.timestamp);

    updateMetricLabels(cpu,response);
    updateStatus(status,decision);
    updateCapacity(instances,recommended);
    updateDecision(decision,cpu,response);
}

function updateMetricLabels(cpu,response){
    let cpuLabel="Healthy";
    if(cpu>70)
        cpuLabel="High";
    else if(cpu<30)
        cpuLabel="Low";

    let responseLabel="Healthy";
    if(response>200)
        responseLabel="High";
    else if(response<100)
        responseLabel="Low";

    document.getElementById("cpuLabel").textContent=cpuLabel;
    document.getElementById("responseLabel").textContent=responseLabel;

    const bar=document.getElementById("cpuBar");
    bar.style.width=`${Math.min(Math.max(cpu,0),100)}%`;

    if(cpu>70)
        bar.style.background="#f59e0b";
    else if(cpu<30)
        bar.style.background="#356ae6";
    else
        bar.style.background="#28a96b";
}

function updateStatus(status,decision){
    const dot=document.getElementById("statusDot");
    const badge=document.getElementById("decisionBadge");
    const decisionStatus=document.getElementById("decisionStatus");
    const description=document.getElementById("statusDescription");

    if(status==="UNDER-PROVISIONED"){
        dot.style.background="#f59e0b";
        dot.style.boxShadow="0 0 0 5px rgba(245,158,11,.12)";
        badge.textContent="↑ SCALE OUT";
        description.textContent="High resource utilization or response time detected. Additional capacity is recommended.";
    }else if(status==="OVER-PROVISIONED"){
        dot.style.background="#356ae6";
        dot.style.boxShadow="0 0 0 5px rgba(53,106,230,.12)";
        badge.textContent="↓ SCALE IN";
        description.textContent="Current capacity exceeds the estimated requirement under the current workload.";
    }else{
        dot.style.background="#28a96b";
        dot.style.boxShadow="0 0 0 5px rgba(40,169,107,.12)";
        badge.textContent="✓ MAINTAIN";
        description.textContent="CPU utilization and response time are within the optimal operating range.";
    }

    decisionStatus.textContent=decision.replace("_"," ");
}

function updateCapacity(instances,recommended){
    const max=Math.max(instances,recommended,1);

    document.getElementById("currentBar").style.width=`${Math.max((instances/max)*100,8)}%`;
    document.getElementById("recommendedBar").style.width=`${Math.max((recommended/max)*100,8)}%`;

    const message=document.getElementById("capacityMessage");

    if(instances===recommended)
        message.textContent="✓ Capacity balanced";
    else if(recommended>instances)
        message.textContent="↑ Additional capacity recommended";
    else
        message.textContent="↓ Excess capacity detected";
}

function updateDecision(decision,cpu,response){
    const main=document.getElementById("decisionMain");
    const explanation=document.getElementById("decisionExplanation");

    if(decision==="SCALE_OUT"){
        main.textContent="SCALE OUT";
        explanation.textContent=`High CPU utilization (${cpu}%) or response time (${response} ms) indicates that additional capacity is required.`;
    }else if(decision==="SCALE_IN"){
        main.textContent="SCALE IN";
        explanation.textContent=`Low CPU utilization (${cpu}%) and healthy response time (${response} ms) indicate excess capacity.`;
    }else{
        main.textContent="MAINTAIN";
        explanation.textContent=`CPU utilization (${cpu}%) and response time (${response} ms) are within the optimal operating range.`;
    }

    document.getElementById("decisionStatus").textContent=decision.replace("_"," ");
}

function updateHistory(data){
    let history=JSON.parse(localStorage.getItem("twinHistory")||"[]");
    const latest=history[0];

    if(!latest||latest.timestamp!==data.timestamp){
        history.unshift(data);
        history=history.slice(0,10);
        localStorage.setItem("twinHistory",JSON.stringify(history));
    }

    renderHistory(history);
    renderHistorySummary(history);
    updateChart();
}

function renderHistory(history){
    const table=document.getElementById("history");

    table.innerHTML=history.map(item=>{
        const statusClass=getStatusClass(item.status);
        const decisionClass=getDecisionClass(item.decision);

        return `
        <tr>
            <td><strong>${item.cpu_utilization}%</strong></td>
            <td>${item.workload} req/s</td>
            <td>${item.response_time_ms} ms</td>
            <td>${item.instances} → ${item.recommended_instances}</td>
            <td><span class="status-badge ${statusClass}">${item.status}</span></td>
            <td><span class="table-decision ${decisionClass}">${item.decision}</span></td>
        </tr>`;
    }).join("");
}

function renderHistorySummary(history){
    const summary=document.getElementById("historySummary");

    summary.innerHTML=history.slice(0,3).map(item=>{
        const decisionClass=getDecisionClass(item.decision);

        return `
        <div class="history-item">
            <div>
                <strong>${item.cpu_utilization}% CPU</strong>
                <div>${item.instances} → ${item.recommended_instances} instances</div>
            </div>
            <span class="history-decision ${decisionClass}">${item.decision}</span>
        </div>`;
    }).join("");
}

function updateChart(){
    const history=JSON.parse(localStorage.getItem("twinHistory")||"[]").reverse();
    const chartLines=document.getElementById("chartLines");
    const empty=document.getElementById("chartEmpty");

    if(history.length===0){
        empty.style.display="flex";
        chartLines.innerHTML="";
        return;
    }

    empty.style.display="none";

    const padding=8;
    const height=100;
    const width=100;
    const maxResponse=Math.max(...history.map(item=>Number(item.response_time_ms)),200);

    const cpuPoints=history.map((item,index)=>{
        const x=history.length===1?50:padding+(index/(history.length-1))*(width-padding*2);
        const y=height-padding-(Math.min(Math.max(Number(item.cpu_utilization),0),100)/100)*(height-padding*2);
        return `${x},${y}`;
    }).join(" ");

    const responsePoints=history.map((item,index)=>{
        const x=history.length===1?50:padding+(index/(history.length-1))*(width-padding*2);
        const y=height-padding-(Math.min(Number(item.response_time_ms),maxResponse)/maxResponse)*(height-padding*2);
        return `${x},${y}`;
    }).join(" ");

    const cpuCircles=createPoints(history,"cpu",maxResponse);
    const responseCircles=createPoints(history,"response",maxResponse);

    chartLines.innerHTML=`
        <svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="${cpuPoints}" fill="none" stroke="#356ae6" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
            <polyline points="${responsePoints}" fill="none" stroke="#7b8798" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
            ${cpuCircles}
            ${responseCircles}
        </svg>`;
}

function createPoints(history,type,maxResponse){
    const padding=8;
    const height=100;
    const width=100;
    const fill=type==="cpu"?"#356ae6":"#7b8798";

    return history.map((item,index)=>{
        const x=history.length===1?50:padding+(index/(history.length-1))*(width-padding*2);
        let y;

        if(type==="cpu")
            y=height-padding-(Math.min(Math.max(Number(item.cpu_utilization),0),100)/100)*(height-padding*2);
        else
            y=height-padding-(Math.min(Number(item.response_time_ms),maxResponse)/maxResponse)*(height-padding*2);

        return `<circle cx="${x}" cy="${y}" r="1.7" fill="${fill}"/>`;
    }).join("");
}

function getStatusClass(status){
    if(status==="UNDER-PROVISIONED")
        return "status-under";
    if(status==="OVER-PROVISIONED")
        return "status-over";
    return "status-optimal";
}

function getDecisionClass(decision){
    if(decision==="SCALE_OUT")
        return "decision-out";
    if(decision==="SCALE_IN")
        return "decision-in";
    return "decision-maintain";
}

function formatTime(timestamp){
    if(!timestamp)
        return "--";

    const date=new Date(timestamp);

    if(Number.isNaN(date.getTime()))
        return timestamp;

    return date.toLocaleTimeString([],{
        hour:"2-digit",
        minute:"2-digit",
        second:"2-digit"
    });
}

loadTwin();
setInterval(loadTwin,10000);